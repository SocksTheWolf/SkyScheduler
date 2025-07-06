
import { Bindings, Post, Repost } from '../types.d';
import { makePost, makeRepost } from './bskyApi';
import { getAllPostsForCurrentTime, getAllRepostsForCurrentTime } from './dbQuery';
import { createPostObject, createRepostObject } from './helpers';

export const schedulePostTask = async(env: Bindings, ctx: ExecutionContext) => {
  const scheduledPosts = await getAllPostsForCurrentTime(env);
  const scheduledReposts = await getAllRepostsForCurrentTime(env);

  // Push any posts
  if (scheduledPosts.length !== 0) {
    scheduledPosts.forEach(async (post) => {
      ctx.waitUntil((async () => {
        const postData: Post = createPostObject(post);
        const newPost:boolean = await makePost(env, postData);
        if (newPost === false) {
          console.error(`Failed to post id ${postData.postid}`);
        }
      })());
    });
  }

  // Push any reposts
  if (scheduledReposts.length !== 0) {
    scheduledReposts.forEach(async (post) => {
      ctx.waitUntil((async () => {
        const postData: Repost = createRepostObject(post);
        const success = await makeRepost(env, postData);
        if (success) {
          // TODO: Delete the pending reposts from d1, needs a better way to track it, smh
        }
      })());
    });
  }

};