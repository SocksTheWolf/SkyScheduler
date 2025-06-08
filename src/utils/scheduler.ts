import { AtpAgent, RichText } from '@atproto/api';
import { Bindings, Post, PostLabel, EmbedData } from '../types';
import truncate from "just-truncate";

const MAX_LENGTH = 300;
const MAX_ALT_TEXT = 2000;
const MAX_EMBEDS = 4;

export const schedulePost = async (env: Bindings, content: Post) => {
  // Post to Bluesky
  const agent = new AtpAgent({
    service: new URL('https://bsky.social'),
  });

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
  const posts = [];

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
  return null;
}