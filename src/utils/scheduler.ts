import AtpAgent from '@atproto/api';
import isEmpty from 'just-is-empty';
import { AllContext, Post, Repost, TaskType } from '../types.d';
import { AgentMap } from './bskyAgents';
import { makePost, makeRepost } from './bskyApi';
import { pruneBskyPosts } from './bskyPrune';
import {
  deleteAllRepostsBeforeCurrentTime, deletePosts, getAllPostsForCurrentTime,
  getAllRepostsForCurrentTime, purgePostedPosts,
  setPostNowOffForPost
} from './db/data';
import { getAllAbandonedMedia } from './db/file';
import { enqueuePost, enqueueRepost, isQueueEnabled, isRepostQueueEnabled, shouldPostNowQueue, shouldPostThreadQueue } from './queuePublisher';
import { deleteFromR2 } from './r2Query';

export const handlePostTask = async(runtime: AllContext, postData: Post, agent: AtpAgent|null) => {
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
}

export const handlePostNowTask = async(c: AllContext, postData: Post) => {
  let postStatus = false;
  if (shouldPostNowQueue(c.env)) {
    try {
      await enqueuePost(c, postData);
      postStatus = true;
    } catch(err) {
      console.error(`Post now queue for ${postData.postid} got error: ${err}`);
      postStatus = false;
    }
  } else {
    const agent = await AgentMap.getAgentDirect(c, postData.user);
    if (agent === null) {
      console.error(`unable to get agent for user ${postData.user} to post now`);
      postStatus = false;
    } else {
      postStatus = await makePost(c, postData, agent);
    }
  }
  if (postStatus === false)
    c.executionCtx.waitUntil(setPostNowOffForPost(c, postData.postid));

  return postStatus;
};

export const handleRepostTask = async(c: AllContext, postData: Repost, agent: AtpAgent|null) => {
  if (agent === null) {
    console.error(`Unable to make agent to post ${postData.postid}`);
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

export const schedulePostTask = async (c: AllContext) => {
  const scheduledPosts: Post[] = await getAllPostsForCurrentTime(c);
  const scheduledReposts: Repost[] = await getAllRepostsForCurrentTime(c);
  const queueEnabled: boolean = isQueueEnabled(c.env);
  const repostQueueEnabled: boolean = isRepostQueueEnabled(c.env);
  const threadQueueEnabled: boolean = shouldPostThreadQueue(c.env);
  const agency = new AgentMap(c.env.TASK_SETTINGS);

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