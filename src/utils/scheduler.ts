import AtpAgent from '@atproto/api';
import isEmpty from 'just-is-empty';
import { AllContext, Post, Repost } from '../types.d';
import { makeAgentForUser, makePost, makeRepost } from './bskyApi';
import { pruneBskyPosts } from './bskyPrune';
import {
  deleteAllRepostsBeforeCurrentTime, deletePosts, getAllPostsForCurrentTime,
  getAllRepostsForCurrentTime, purgePostedPosts
} from './db/data';
import { getAllAbandonedMedia } from './db/file';
import { enqueuePost, enqueueRepost, isQueueEnabled, isRepostQueueEnabled, shouldPostThreadQueue } from './queuePublisher';
import { deleteFromR2 } from './r2Query';

export const handlePostTask = async(runtime: AllContext, postData: Post, agent: AtpAgent|null) => {
  const madePost = await makePost(runtime, postData, agent);
  if (madePost) {
    console.log(`Made post ${postData.postid} successfully`);
  } else {
    console.error(`Failed to post id ${postData.postid}`);
  }
  return madePost;
}
export const handleRepostTask = async(c: AllContext, postData: Repost, agent: AtpAgent|null) => {
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
  // Temporary cache of agents to make handling actions much better and easier.
  // The only potential downside is if we run hot on RAM with a lot of users. Before, the agents would
  // get freed up as a part of exiting their cycle, but this would make that worse...
  //
  // TODO: bunching as a part of queues, literally just throw an agent at a queue with instructions and go.
  // this requires queueing to be working properly.
  const AgentList = new Map();
  const usesAgentMap: boolean = (c.env.SITE_SETTINGS.use_agent_map) || false;

  // Push any posts
  if (!isEmpty(scheduledPosts)) {
    console.log(`handling ${scheduledPosts.length} posts...`);
    for (const post of scheduledPosts) {
      if (queueEnabled || (post.isThreadRoot && threadQueueEnabled)) {
        await enqueuePost(c, post);
      } else {
        let agent = (usesAgentMap) ? AgentList.get(post.user) || null : null;
        if (agent === null) {
          agent = await makeAgentForUser(c, post.user);
          if (usesAgentMap)
            AgentList.set(post.user, agent);
        }
        c.ctx.waitUntil(handlePostTask(c, post, agent));
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
        let agent = (usesAgentMap) ? AgentList.get(repost.userId) || null : null;
        if (agent === null) {
          agent = await makeAgentForUser(c, repost.userId);
          if (usesAgentMap)
            AgentList.set(repost.userId, agent);
        }
        c.ctx.waitUntil(handleRepostTask(c, repost, agent));
      } else {
        await enqueueRepost(c, repost);
      }
    };
    c.ctx.waitUntil(deleteAllRepostsBeforeCurrentTime(c));
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