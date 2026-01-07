import { Bindings, ScheduledContext, Post, Repost, QueueTaskData, QueueTaskType } from '../types.d';
import { makePost, makeRepost } from './bskyApi';
import { pruneBskyPosts } from './bskyPrune';
import { getAllPostsForCurrentTime, deleteAllRepostsBeforeCurrentTime, getAllRepostsForCurrentTime, deletePosts, purgePostedPosts } from './dbQuery';
import { createPostObject, createRepostObject } from './helpers';
import isEmpty from 'just-is-empty';
import random from 'just-random';
import get from 'just-safe-get';

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

// picks a random queue to publish data to
const getRandomQueue = (env: Bindings, listName: string): Queue|null => {
  const queueListNames: string[] = get(env.QUEUE_SETTINGS, listName, []);
  if (isEmpty(queueListNames))
    return null;

  const queueName: string = random(queueListNames) || "";
  console.log(`Picked ${queueName} from ${listName}`);
  return get(env, queueName, null);
};

export const schedulePostTask = async(env: Bindings, ctx: ExecutionContext) => {
  const scheduledPosts = await getAllPostsForCurrentTime(env);
  const scheduledReposts = await getAllRepostsForCurrentTime(env);
  const queueContentType = 'json';
  const runtimeWrapper: ScheduledContext = {
    executionCtx: ctx,
    env: env
  };
  
  // Push any posts
  if (!isEmpty(scheduledPosts)) {
    console.log(`handling ${scheduledPosts.length} posts...`);
    scheduledPosts.forEach(async (post) => {
      const postData: Post = createPostObject(post);
      if (env.QUEUE_SETTINGS.enabled) {
        // Pick a random consumer to handle this post
        const queueConsumer: Queue|null = getRandomQueue(env, "post_queues");
        if (queueConsumer !== null)
          queueConsumer.send({type: QueueTaskType.Post, post: postData} as QueueTaskData, { contentType: queueContentType });
      }
      else
        ctx.waitUntil(handlePostTask(runtimeWrapper, postData));
    });
  } else {
    console.log("no posts scheduled for this time");
  }

  // Push any reposts
  if (!isEmpty(scheduledReposts)) {
    console.log(`handling ${scheduledReposts.length} reposts`);
    scheduledReposts.forEach(async (post) => {
      const postData: Repost = createRepostObject(post);
      if (env.QUEUE_SETTINGS.enabled) {
        // Pick a random consumer to handle this repost
        const queueConsumer: Queue|null = getRandomQueue(env, "repost_queues");
        if (queueConsumer !== null)
          queueConsumer.send({type: QueueTaskType.Repost, repost: postData} as QueueTaskData, { contentType: queueContentType });
      }
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