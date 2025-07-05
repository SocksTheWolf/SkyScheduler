import { AtpAgent, RichText } from '@atproto/api';
import { MAX_ALT_TEXT, MAX_EMBEDS, MAX_LENGTH } from '../limits.d';
import { Bindings, Post, PostLabel, EmbedData, PostResponseObject } from '../types.d';
import truncate from "just-truncate";
import { getAllPostsForCurrentTime, updatePostData } from './dbQuery';
import { createPostObject } from './helpers';
import { deleteFromR2 } from './r2Query';

export const schedulePost = async (env: Bindings, content: Post) => {
  // Post to Bluesky
  const agent = new AtpAgent({
    service: new URL('https://bsky.social'),
  });

  // TODO: Get the user data from the useruuid data field
  await agent.login({
    identifier: env.BSKY_USERNAME,
    password: env.BSKY_PASSWORD,
  });

  const rt = new RichText({
    text: content.text,
  });

  await rt.detectFacets(agent);

  // Segment the text into manageable parts
  const segments = rt.segments();

  let currentPost = '';
  let currentPostLength = 0;
  let currentEmbedIndex = 0;
  const posts:PostResponseObject[] = [];

  const postSegment = async (data: string) => {
    let postRecord = {
      $type: 'app.bsky.feed.post',
      text: data,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    };
    if (content.label != PostLabel.None) {
      let contentStr = "";
      switch (content.label) {
        case PostLabel.Adult:
          contentStr = "porn";
        break;
        case PostLabel.Graphic:
          contentStr = "graphic-media";
        break;
        case PostLabel.Nudity:
          contentStr = "nudity";
        break;
        case PostLabel.Suggestive:
          contentStr = "sexual";
        break;
      }
      (postRecord as any).labels = {
        "$type": "com.atproto.label.defs#selfLabels",
        "values": [{"val": contentStr}]
      };
    }

    // Upload any images to this post
    if (content.embeds?.length) {
      let imagesArray = [];
      for (; currentEmbedIndex < MAX_EMBEDS && currentEmbedIndex < content.embeds.length; ++currentEmbedIndex) {
        const currentEmbed: EmbedData = content.embeds[currentEmbedIndex];
        const file = await env.R2.get(currentEmbed.content);
        if (file) {
          const uploadImg = await agent.uploadBlob(await file.blob(), {encoding: file.httpMetadata?.contentType });
          imagesArray.push({
            "image": uploadImg.data.blob, 
            "alt": truncate(currentEmbed.alt, MAX_ALT_TEXT)
          });
        } else {
          console.warn(`Could not get the image ${currentEmbed.content} for post!`);
        }
      }
      // Push the embed images into the post record.
      if (imagesArray.length > 0) {
        (postRecord as any).embed = {
          "images": imagesArray,
          "$type": "app.bsky.embed.images"
        }
      }
    }

    const response = await agent.post(postRecord);
    posts.push(response);
  };

  for (const segment of segments) {
    const segmentText = segment.text;
    if (currentPostLength + segmentText.length > MAX_LENGTH) {
      // Post the current segment and reset
      if (currentPost) {
        await postSegment(currentPost);
        currentPost = '';
        currentPostLength = 0;
      }
      // Handle the new segment
      currentPost = segmentText;
      currentPostLength = segmentText.length;
    } else {
      currentPost += segmentText;
      currentPostLength += segmentText.length;
    }
  }

  // Post the last segment if any
  if (currentPost) {
    await postSegment(currentPost);
  }

  console.log(`Posted to Bluesky: ${posts.map(p => p.uri)}`);
  // store the first uri/cid
  return posts[0];
}

export const schedulePostTask = async(env: Bindings, ctx: ExecutionContext) => {
  const scheduledPosts = await getAllPostsForCurrentTime(env);
  if (scheduledPosts.length === 0) {
    console.log("No scheduled posts found for current time");
    return;
  }

  scheduledPosts.forEach(async (post) => {
    ctx.waitUntil((async () => {
      const postData = createPostObject(post);
      const newPost: PostResponseObject = await schedulePost(env, postData);
      await updatePostData(env, post.uuid, { posted: true, uri: newPost.uri, cid: newPost.cid });
      // Delete any embeds if they exist.
      await deleteFromR2(env, postData.embeds);
    })());
  });
};