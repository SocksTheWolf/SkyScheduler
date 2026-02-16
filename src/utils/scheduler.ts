import AtpAgent from '@atproto/api';
import isEmpty from 'just-is-empty';
import { Bindings, Post, Repost, ScheduledContext } from '../types.d';
import { makeAgentForUser, makePost, makeRepost } from './bskyApi';
import { pruneBskyPosts } from './bskyPrune';
import {
  deleteAllRepostsBeforeCurrentTime, deletePosts, getAllPostsForCurrentTime,
  getAllRepostsForCurrentTime, purgePostedPosts
} from './db/data';
import { getAllAbandonedMedia } from './db/file';
import { enqueuePost, enqueueRepost, isQueueEnabled, isRepostQueueEnabled, shouldPostThreadQueue } from './queuePublisher';
import { deleteFromR2 } from './r2Query';

export const handlePostTask = async(runtime: ScheduledContext, postData: Post, agent: AtpAgent|null) => {
  const madePost = await makePost(runtime, postData, agent);
  if (madePost) {
    console.log(`Made post ${postData.postid} successfully`);
  } else {
    console.error(`Failed to post id ${postData.postid}`);
  }
  return madePost;
}
export const handleRepostTask = async(runtime: ScheduledContext, postData: Repost, agent: AtpAgent|null) => {
  const madeRepost = await makeRepost(runtime, postData, agent);
  if (madeRepost) {
    console.log(`Reposted ${postData.uri} successfully!`);
  } else {
    console.warn(`Failed to repost ${postData.uri}`);
  }
  return madeRepost;
};

export const schedulePostTask = async (env: Bindings, ctx: ExecutionContext) => {
  const scheduledPosts: Post[] = await getAllPostsForCurrentTime(env);
  const scheduledReposts: Repost[] = await getAllRepostsForCurrentTime(env);
  const queueEnabled: boolean = isQueueEnabled(env);
  const repostQueueEnabled: boolean = isRepostQueueEnabled(env);
  const threadQueueEnabled: boolean = shouldPostThreadQueue(env);

  const runtimeWrapper: ScheduledContext = {
    executionCtx: ctx,
    env: env
  };

  // Temporary cache of agents to make handling actions much better and easier.
  // The only potential downside is if we run hot on RAM with a lot of users. Before, the agents would
  // get freed up as a part of exiting their cycle, but this would make that worse...
  //
  // TODO: bunching as a part of queues, literally just throw an agent at a queue with instructions and go.
  // this requires queueing to be working properly.
  const AgentList = new Map();
  const usesAgentMap: boolean = (env.SITE_SETTINGS.use_agent_map) || false;

  // Push any posts
  if (!isEmpty(scheduledPosts)) {
    console.log(`handling ${scheduledPosts.length} posts...`);
    for (const post of scheduledPosts) {
      if (queueEnabled || (post.isThreadRoot && threadQueueEnabled)) {
        await enqueuePost(env, post);
      } else {
        let agent = (usesAgentMap) ? AgentList.get(post.user) || null : null;
        if (agent === null) {
          agent = await makeAgentForUser(env, post.user);
          if (usesAgentMap)
            AgentList.set(post.user, agent);
        }
        ctx.waitUntil(handlePostTask(runtimeWrapper, post, agent));
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
          agent = await makeAgentForUser(env, repost.userId);
          if (usesAgentMap)
            AgentList.set(repost.userId, agent);
        }
        ctx.waitUntil(handleRepostTask(runtimeWrapper, repost, agent));
      } else {
        await enqueueRepost(env, repost);
      }
    };
    ctx.waitUntil(deleteAllRepostsBeforeCurrentTime(env));
  } else {
    console.log("no reposts scheduled for this time");
  }
};

export const cleanUpPostsTask = async(env: Bindings, ctx: ExecutionContext) => {
  const purgedPosts: number = await purgePostedPosts(env);
  console.log(`Purged ${purgedPosts} old posts from the database`);

  const removedIds: string[] = await pruneBskyPosts(env);
  if (!isEmpty(removedIds)) {
    const deletedItems: number = await deletePosts(env, removedIds);
    console.log(`Deleted ${deletedItems} missing posts from the db`);
  }
  if (env.R2_SETTINGS.auto_prune === true)
    await cleanupAbandonedFiles(env, ctx);
};

export const cleanupAbandonedFiles = async(env: Bindings, ctx: ExecutionContext) => {
  const abandonedFiles: string[] = await getAllAbandonedMedia(env);
  const runtimeWrapper: ScheduledContext = {
    executionCtx: ctx,
    env: env
  };
  if (!isEmpty(abandonedFiles)) {
    await deleteFromR2(runtimeWrapper, abandonedFiles);
  }
};