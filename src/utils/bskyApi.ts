import { AtpAgent, RichText } from '@atproto/api';
import { Bindings, Post, Repost, PostLabel, EmbedData, PostResponseObject, LooseObj } from '../types.d';
import { MAX_ALT_TEXT, MAX_EMBEDS, MAX_LENGTH, MAX_POSTED_LENGTH } from '../limits.d';
import { updatePostData, getBskyUserPassForId } from './dbQuery';
import { deleteEmbedsFromR2 } from './r2Query';
import {imageDimensionsFromStream} from 'image-dimensions';
import truncate from "just-truncate";

export const lookupBskyHandle = async (user: string) => {
  const lookupRequest = await fetch(`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${user}`);
  if (lookupRequest.ok) {
    const response:any = await lookupRequest.json();
    return response.did;
  }
  return null;
};

export const loginToBsky = async (agent: AtpAgent, user: string, pass: string) => {
  try {
    const loginResponse = await agent.login({
      identifier: user,
      password: pass,
    });
    if (!loginResponse.success) {
      console.warn(`could not login as user ${user}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`encountered exception on login for user ${user}, err ${err}`);
  }
  return false;
}

export const makeRepost = async (env: Bindings, content: Repost) => {
  let bWasSuccess = true;
  const loginCreds = await getBskyUserPassForId(env, content.userId);
  const {user, pass, pds} = loginCreds[0];
  const agent = new AtpAgent({
    service: new URL(pds),
  });

  if (user === null || pass === null) {
    console.error(`The username/pass for userid ${content.userId} is invalid!`);
    return false;
  }

  const loginResponse = await loginToBsky(agent, user, pass);
  if (!loginResponse) {
    // TODO: Probably should handle failure better here.
    return false;
  }

  try {
    await agent.deleteRepost(content.uri);
  } catch(err) {
    // This probably should not be a warning, and should silently fail.
    // the only thing that actually matters is the object below.
    console.warn(`failed to unrepost post ${content.uri} with err ${err}`);
  }
  
  try {
    await agent.repost(content.uri, content.cid);
  } catch(err) {
    console.error(`Failed to repost ${content.uri}, got error ${err}`);
    bWasSuccess = false;
  }

  return bWasSuccess;
};

export const makePostRaw = async (env: Bindings, content: Post) => {
  const loginCreds = await getBskyUserPassForId(env, content.user);
  const {user, pass, pds} = loginCreds[0];
  // Post to Bluesky
  const agent = new AtpAgent({
    service: new URL(pds),
  });

  if (user === null || pass === null) {
    console.error(`The username/pass for userid ${content.user} is invalid!`);
    return null;
  }

  const loginResponse = await loginToBsky(agent, user, pass);
  if (!loginResponse) {
    // TODO: Probably should handle failure better here.
    return null;
  }

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
      let contentStr:string = "";
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
          const imageBlob = await file.blob();
          // Attempt to get the width and height of the image file.
          const sizeResult = await imageDimensionsFromStream(await imageBlob.stream());
          // Upload the data itself.
          const uploadImg = await agent.uploadBlob(imageBlob, {encoding: file.httpMetadata?.contentType });
          const bskyMetadata:LooseObj = {
            "image": uploadImg.data.blob, 
            "alt": truncate(currentEmbed.alt, MAX_ALT_TEXT),
          };

          // If we were able to parse the width and height of the image, then append the aspect ratio into the image record.
          if (sizeResult) {
            bskyMetadata.aspectRatio = {
              "width": sizeResult.width,
              "height": sizeResult.height
            }
          }

          imagesArray.push(bskyMetadata);
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

export const makePost = async (env: Bindings, content: Post) => {
  try {
    const newPost: PostResponseObject|null = await makePostRaw(env, content);
    if (newPost !== null) {
      await updatePostData(env, content.postid, { posted: true, uri: newPost.uri, cid: newPost.cid, 
        content: truncate(content.text, MAX_POSTED_LENGTH), embedContent: [] });

      // Delete any embeds if they exist.
      await deleteEmbedsFromR2(env, content.embeds);
      return true;
    }
  } catch(err) {
    console.error(`Failed to make post for id ${content.postid}, got error ${err}`);
  }
  return false;
}

export const getPostRecords = async (records:string[]) => {
  const agent = new AtpAgent({
    service: new URL('https://public.api.bsky.app'),
  });

  const response = await agent.app.bsky.feed.getPosts({uris: records});
  if (response.success)
    return response.data.posts;
  else
    return null;
}