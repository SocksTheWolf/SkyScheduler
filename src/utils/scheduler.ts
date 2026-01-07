import { Bindings, ScheduledContext, Post, Repost, QueueBatchData } from '../types.d';
import { makePost, makeRepost } from './bskyApi';
import { pruneBskyPosts } from './bskyPrune';
import { getAllPostsForCurrentTime, deleteAllRepostsBeforeCurrentTime, getAllRepostsForCurrentTime, deletePosts, purgePostedPosts } from './dbQuery';
import { createPostObject, createRepostObject } from './helpers';
import isEmpty from 'just-is-empty';

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

export const schedulePostTask = async(env: Bindings, ctx: ExecutionContext) => {
  const scheduledPosts = await getAllPostsForCurrentTime(env);
  const scheduledReposts = await getAllRepostsForCurrentTime(env);
  const runtimeWrapper: ScheduledContext = {
    executionCtx: ctx,
    env: env
  };

  const useQueues: boolean = env.USE_QUEUES;
  const queueContentType = 'json';

  // Push any posts
  if (!isEmpty(scheduledPosts)) {
    scheduledPosts.forEach(async (post) => {
      const postData: Post = createPostObject(post);
      if (useQueues)
        env.POST_QUEUE.send({post: postData} as QueueBatchData, { contentType: queueContentType });
      else
        ctx.waitUntil(handlePostTask(runtimeWrapper, postData));
    });
  } else {
    console.log("no posts scheduled for this time");
  }

  // Push any reposts
  if (!isEmpty(scheduledReposts)) {
    scheduledReposts.forEach(async (post) => {
      const postData: Repost = createRepostObject(post);
      if (useQueues)
        env.POST_QUEUE.send({repost: postData} as QueueBatchData, { contentType: queueContentType });
      else
        ctx.waitUntil(handleRepostTask(runtimeWrapper, postData));
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
};