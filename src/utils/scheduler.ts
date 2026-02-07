import isEmpty from 'just-is-empty';
import { Bindings, Post, Repost, ScheduledContext } from '../types.d';
import { makePost, makeRepost } from './bskyApi';
import { pruneBskyPosts } from './bskyPrune';
import {
  deleteAllRepostsBeforeCurrentTime,
  deletePosts,
  getAllPostsForCurrentTime,
  getAllRepostsForCurrentTime,
  purgePostedPosts
} from './dbQuery';
import { getAllAbandonedMedia } from './dbQueryFile';
import { enqueuePost, enqueueRepost, isQueueEnabled } from './queuePublisher';
import { deleteFromR2 } from './r2Query';

export const handlePostTask = async(runtime: ScheduledContext, postData: Post, isQueued: boolean = false) => {
  const madePost = await makePost(runtime, postData, isQueued);
  if (madePost) {
    console.log(`Made post ${postData.postid} successfully`);
  } else {
    console.error(`Failed to post id ${postData.postid}`);
  }
  return madePost;
}
export const handleRepostTask = async(runtime: ScheduledContext, postData: Repost) => {
  const madeRepost = await makeRepost(runtime, postData);
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

  const runtimeWrapper: ScheduledContext = {
    executionCtx: ctx,
    env: env
  };
  
  // Push any posts
  if (!isEmpty(scheduledPosts)) {
    console.log(`handling ${scheduledPosts.length} posts...`);
    scheduledPosts.forEach(async (post) => {
      if (queueEnabled)
        await enqueuePost(env, post); 
      else
        ctx.waitUntil(handlePostTask(runtimeWrapper, post));
    });
  } else {
    console.log("no posts scheduled for this time");
  }

  // Push any reposts
  if (!isEmpty(scheduledReposts)) {
    console.log(`handling ${scheduledReposts.length} reposts`);
    scheduledReposts.forEach(async (repost) => {
      if (queueEnabled)
        await enqueueRepost(env, repost);
      else
        ctx.waitUntil(handleRepostTask(runtimeWrapper, repost));
    });
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