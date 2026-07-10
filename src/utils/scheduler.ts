import isEmpty from 'just-is-empty';
import { AgentMap, type AtProtoAgent } from '../classes/bskyAgents';
import type { Post } from "../classes/post";
import type { Repost } from "../classes/repost";
import { TaskType } from "../enums";
import { POSTING_TIME_INTERVAL, REPOSTING_TIME_INTERVAL, USE_VIDEO_WORKFLOWS } from '../limits';
import type { AllContext } from '../types';
import { makePost, makeRepost } from './bsky/bskyApi';
import { pruneBskyPosts } from './bsky/bskyPrune';
import {
  deleteAllRepostsBeforeCurrentTime, deletePosts,
  getAllPostsForCurrentTime,
  getAllRepostsForCurrentTime, purgePostedPosts,
  setPostNowOffForPost
} from './db/data';
import { getAllAbandonedMedia } from './db/file';
import {
  enqueuePost, enqueueRepost, isQueueEnabled,
  isRepostQueueEnabled, shouldPostNowQueue,
  shouldPostThreadQueue
} from './queues/queuePublisher';
import { deleteFromR2 } from './r2Query';
import { pushVideoPostWorkflow } from './workflows/uploadAndPublish';

export const handlePostTask = async(runtime: AllContext, postData: Post, agent: AtProtoAgent|null) => {
  if (agent === null) {
    console.error(`Unable to make agent to post ${postData.postid}`);
    return false;
  }
  const madePost = await makePost(runtime, postData, agent);
  if (madePost) {
    console.log(`Made post ${postData.postid} successfully`);
  } else {
    console.error(`Failed to post id ${postData.postid}`);
  }
  return madePost;
};

export const handlePostNowTask = async(c: AllContext, postData: Post) => {
  let postStatus = false;
  if (shouldPostNowQueue(c.env)) {
    try {
      c.executionCtx.waitUntil(enqueuePost(c, postData));
      postStatus = true;
    } catch(err) {
      console.error(`Post now queue for ${postData.postid} got error: ${err}`);
      postStatus = false;
    }
  } else {
    const {agent} = await AgentMap.getAgentDirect(c, postData.user, false);
    if (agent === null) {
      console.error(`unable to get agent for user ${postData.user} to post now`);
      postStatus = false;
    } else {
      if (USE_VIDEO_WORKFLOWS && postData.getVideoEmbed() !== undefined) {
        postStatus = await pushVideoPostWorkflow(c, postData, agent);
      } else {
        postStatus = await makePost(c, postData, agent);
      }
    }
  }
  if (postStatus === false)
    c.executionCtx.waitUntil(setPostNowOffForPost(c, postData.postid));

  return postStatus;
};

export const handleRepostTask = async(c: AllContext, postData: Repost, agent: AtProtoAgent|null) => {
  if (agent === null) {
    console.error(`Unable to make agent to repost ${postData.postid}`);
    return false;
  }
  const madeRepost = await makeRepost(c, postData, agent);
  if (madeRepost) {
    console.log(`Reposted ${postData.uri} successfully!`);
  } else {
    console.warn(`Failed to repost ${postData.uri}`);
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
    console.warn("Posting time and Reposting time are on different cadances. Please change!");
  }

  await schedulePostTask(c, agency);
  await scheduleRepostTask(c, agency);
};

export const schedulePostTask = async (c: AllContext, withAgency?: AgentMap) => {
  const scheduledPosts: Post[] = await getAllPostsForCurrentTime(c);
  const queueEnabled: boolean = isQueueEnabled(c.env);
  const threadQueueEnabled: boolean = shouldPostThreadQueue(c.env);
  const agency = (withAgency) ? withAgency : new AgentMap(c.env.TASK_SETTINGS);

  // Push any posts
  if (!isEmpty(scheduledPosts)) {
    console.log(`handling ${scheduledPosts.length} posts...`);
    for (const post of scheduledPosts) {
      if (queueEnabled || (post.isThreadRoot && threadQueueEnabled)) {
        await enqueuePost(c, post);
      } else {
        let agent = await agency.getOrAddAgent(c, post.user, TaskType.Post);
        c.executionCtx.waitUntil(handlePostTask(c, post, agent));
      }
    }
  } else {
    console.log("no posts scheduled for this time");
  }
};

export const scheduleRepostTask = async (c: AllContext, withAgency?: AgentMap) => {
  const agency = (withAgency) ? withAgency : new AgentMap(c.env.TASK_SETTINGS);
  const repostQueueEnabled: boolean = isRepostQueueEnabled(c.env);
  const scheduledReposts: Repost[] = await getAllRepostsForCurrentTime(c);
  // Push any reposts
  if (!isEmpty(scheduledReposts)) {
    console.log(`handling ${scheduledReposts.length} reposts`);
    for (const repost of scheduledReposts) {
      if (!repostQueueEnabled) {
        let agent = await agency.getOrAddAgent(c, repost.userId, TaskType.Repost);
        c.executionCtx.waitUntil(handleRepostTask(c, repost, agent));
      } else {
        await enqueueRepost(c, repost);
      }
    };
    c.executionCtx.waitUntil(deleteAllRepostsBeforeCurrentTime(c));
  } else {
    console.log("no reposts scheduled for this time");
  }
};

export const cleanUpPostsTask = async(c: AllContext) => {
  const purgedPosts: number = await purgePostedPosts(c);
  console.log(`Purged ${purgedPosts} old posts from the database`);

  const removedIds: string[] = await pruneBskyPosts(c);
  if (!isEmpty(removedIds)) {
    const deletedItems: number = await deletePosts(c, removedIds);
    console.log(`Deleted ${deletedItems} missing posts from the db`);
  }
  if (c.env.R2_SETTINGS.auto_prune === true)
    await cleanupAbandonedFiles(c);
};

export const cleanupAbandonedFiles = async(c: AllContext) => {
  const abandonedFiles: string[] = await getAllAbandonedMedia(c);
  if (!isEmpty(abandonedFiles)) {
    await deleteFromR2(c, abandonedFiles);
  }
};

export const handleSchedule = (c: AllContext, cronTime: string) => {
  // if any new crontime schedules are added, they should be handled in here
  // otherwise the default will execute
  switch (cronTime) {
    // Leave this cronjob alone
    case "37 03 * * sun":
      c.executionCtx.waitUntil(cleanUpPostsTask(c));
    break;
    /* MODIFY CRONJOBS FROM HERE */
    case "0 * * * *":
      // Remember to add scheduleRepostTask or schedulePostTask respectively if these ever change.
      c.executionCtx.waitUntil(scheduleAllContentTasks(c));
    break;
    case "30 * * * *":
      c.executionCtx.waitUntil(scheduleRepostTask(c));
    break;
    /* END MODIFICATION */
    default:
      console.error(`No tasks have been defined for ${cronTime}`);
    break;
  }
};