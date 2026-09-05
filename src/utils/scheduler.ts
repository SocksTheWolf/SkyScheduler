import isEmpty from "just-is-empty";
import { SERVICE_DOMAIN } from "../appInfo";
import type { AtProtoAgent } from "../classes/bskyAgents";
import { AgentMap } from "../classes/bskyAgents";
import type { Post } from "../classes/post";
import type { Repost } from "../classes/repost";
import {
  POSTING_TIME_INTERVAL, REPOSTING_TIME_INTERVAL,
  SHOW_SUPPORT_PROGRESS_BAR
} from "../config";
import { TaskType, TimeIntervalSettings } from "../enums";
import type { AllContext } from "../types";
import { makePost, makeRepost } from "./bsky/bskyApi";
import { pruneBskyPosts } from "./bsky/bskyPrune";
import {
  deleteAllRepostsBeforeCurrentTime,
  deletePosts,
  getAllPostsForCurrentTime,
  getAllRepostsForCurrentTime,
  purgePostedPosts,
  setPostNowOffForPost,
} from "./db/data";
import { getAllAbandonedMedia } from "./db/file";
import {
  enqueuePost,
  enqueueRepost,
  isQueueEnabled,
  isRepostQueueEnabled,
  shouldPostNowQueue
} from "./queues/queuePublisher";
import { deleteFromR2 } from "./r2Query";

export const handlePostTask = async (runtime: AllContext, postData: Post, agent: AtProtoAgent | null) => {
  if (agent === null) {
    console.error(`Unable to make agent to post ${postData.uuid}`);
    return false;
  }
  const madePost = await makePost(runtime, postData, agent);
  if (madePost) {
    console.log(`Made post ${postData.uuid} successfully`);
  } else {
    console.error(`Failed to post id ${postData.uuid}`);
  }
  return madePost;
};

export const handlePostNowTask = async (c: AllContext, postData: Post) => {
  let postStatus;
  if (shouldPostNowQueue(c.env)) {
    try {
      c.executionCtx.waitUntil(enqueuePost(c, postData));
      postStatus = true;
    } catch (err: unknown) {
      console.error(`Post now queue for ${postData.uuid} got error: ` + String(err));
      postStatus = false;
    }
  } else {
    const { agent } = await AgentMap.getAgentDirect(c, postData.userId, false);
    if (agent === null) {
      console.error(`unable to get agent for user ${postData.userId} to post now`);
      postStatus = false;
    } else {
      postStatus = await makePost(c, postData, agent);
    }
  }
  if (!postStatus)
    c.executionCtx.waitUntil(setPostNowOffForPost(c, postData.uuid));

  return postStatus;
};

export const handleRepostTask = async (c: AllContext, postData: Repost, agent: AtProtoAgent | null) => {
  if (agent === null) {
    console.error(`Unable to make agent to repost ${postData.uuid}`);
    return false;
  }
  const madeRepost = await makeRepost(c, postData, agent);
  if (madeRepost) {
    console.log(`Reposted ${postData.uri} successfully!`);
  }
  return madeRepost;
};

// This will run both the scheduled post task and the schedule repost task.
// default behavior.
export const scheduleAllContentTasks = async (c: AllContext) => {
  const agency: AgentMap = new AgentMap(c.env.TASK_SETTINGS);
  if (POSTING_TIME_INTERVAL != REPOSTING_TIME_INTERVAL) {
    // If you are going to have different cadances, it's recommended you do not use this function
    // but instead swap over to calling schedulePostTask/scheduleRepostTask individually in the
    // handleSchedule function in this file
    console.error("Posting time and Reposting time are on different cadances. Please change!");
    return;
  }

  await schedulePostTask(c, agency);
  await scheduleRepostTask(c, agency);
};

export const schedulePostTask = async (c: AllContext, withAgency?: AgentMap) => {
  const scheduledPosts: Post[] = await getAllPostsForCurrentTime(c);
  const queueEnabled: boolean = isQueueEnabled(c.env);
  const agency = withAgency ?? new AgentMap(c.env.TASK_SETTINGS);

  // Push any posts
  if (!isEmpty(scheduledPosts)) {
    console.log(`handling ${scheduledPosts.length} posts...`);
    for (const post of scheduledPosts) {
      if (queueEnabled) {
        await enqueuePost(c, post);
      } else {
        const agent = await agency.getOrAddAgent(c, post.userId, TaskType.Post);
        c.executionCtx.waitUntil(handlePostTask(c, post, agent));
      }
    }
  } else {
    console.log("no posts scheduled for this time");
  }
};

export const scheduleRepostTask = async (c: AllContext, withAgency?: AgentMap) => {
  const agency = withAgency ?? new AgentMap(c.env.TASK_SETTINGS);
  const repostQueueEnabled: boolean = isRepostQueueEnabled(c.env);
  const scheduledReposts: Repost[] = await getAllRepostsForCurrentTime(c);
  // Push any reposts
  if (!isEmpty(scheduledReposts)) {
    console.log(`handling ${scheduledReposts.length} reposts`);
    for (const repost of scheduledReposts) {
      if (!repostQueueEnabled) {
        const agent = await agency.getOrAddAgent(c, repost.userId, TaskType.Repost);
        c.executionCtx.waitUntil(handleRepostTask(c, repost, agent));
      } else {
        await enqueueRepost(c, repost);
      }
    }
    c.executionCtx.waitUntil(deleteAllRepostsBeforeCurrentTime(c));
  } else {
    console.log("no reposts scheduled for this time");
  }
};

export const cleanUpPostsTask = async (c: AllContext) => {
  const purgedPosts: number = await purgePostedPosts(c);
  console.log(`Purged ${purgedPosts} old posts from the database`);

  const removedIds: string[] = await pruneBskyPosts(c);
  if (!isEmpty(removedIds)) {
    const deletedItems: number = await deletePosts(c, removedIds);
    console.log(`Deleted ${deletedItems} missing posts from the db`);
  }
  if (c.env.R2_SETTINGS.auto_prune) {
    console.log("Cleaning up abandoned files...");
    await cleanupAbandonedFiles(c);
  }
};

export const cleanupAbandonedFiles = async (c: AllContext) => {
  const abandonedFiles: string[] = await getAllAbandonedMedia(c);
  if (!isEmpty(abandonedFiles)) {
    await deleteFromR2(c, abandonedFiles);
  }
};

export const handleSchedule = (c: AllContext, cronTime: string) => {
  // helper function for writing the appropriate cron tab job
  const getCronTimeForInterval = (input: TimeIntervalSettings): string => {
    if (input === TimeIntervalSettings.Hour) {
      return "0 * * * *"
    }
    return `*/${input} * * * *`;
  };

  // dynamically determine the cron task filter based on settings
  //
  // the default strings are garbage to prevent accidental matches
  // or overlaps
  let repostTask = "repost", postTask = "post", bothTask = "both";
  if (POSTING_TIME_INTERVAL != REPOSTING_TIME_INTERVAL) {
    repostTask = getCronTimeForInterval(REPOSTING_TIME_INTERVAL);
    postTask = getCronTimeForInterval(POSTING_TIME_INTERVAL);
  } else {
    bothTask = getCronTimeForInterval(POSTING_TIME_INTERVAL);
  }

  switch (cronTime) {
    case "37 03 * * sun":
      c.executionCtx.waitUntil(cleanUpPostsTask(c));
      break;
    case "0 0 1 */1 *":
      // reset the server status bar every month
      if (SHOW_SUPPORT_PROGRESS_BAR && c.env.FUNDING !== undefined) {
        c.executionCtx.waitUntil(c.env.FUNDING.put(SERVICE_DOMAIN, "0.00"));
      }
    break;
    case bothTask:
      // Remember to add scheduleRepostTask or schedulePostTask respectively if these ever change.
      c.executionCtx.waitUntil(scheduleAllContentTasks(c));
      break;
    case postTask:
      c.executionCtx.waitUntil(schedulePostTask(c));
      break;
    case repostTask:
      c.executionCtx.waitUntil(scheduleRepostTask(c));
      break;
    default:
      console.error(`No tasks have been defined for ${cronTime}`);
      break;
  }
};
