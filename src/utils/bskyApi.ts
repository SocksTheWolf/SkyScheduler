import { type AppBskyFeedPost, AtpAgent, RichText } from '@atproto/api';
import { Bindings, Post, Repost, PostLabel, EmbedData, PostResponseObject, LooseObj, PlatformLoginResponse, EmbedDataType } from '../types.d';
import { MAX_ALT_TEXT, MAX_EMBEDS, MAX_LENGTH, MAX_POSTED_LENGTH } from '../limits.d';
import { updatePostData, getBskyUserPassForId, createViolationForUser } from './dbQuery';
import { deleteEmbedsFromR2 } from './r2Query';
import {imageDimensionsFromStream} from 'image-dimensions';
import truncate from "just-truncate";
import isEmpty from "just-is-empty";

export const lookupBskyHandle = async (user: string) => {
  const lookupRequest = await fetch(`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${user}`, {
    cf: {
      cacheTtlByStatus: {"200-299": 600, 404: 1, "500-599": 0},
      cacheEverything: true,
    }
  });
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
      if (loginResponse.data.active == false) {
        switch (loginResponse.data.status) {
          case "deactivated":
            return PlatformLoginResponse.Deactivated;
          case "suspended":
            return PlatformLoginResponse.Suspended;
          case "takendown":
            return PlatformLoginResponse.TakenDown;
        }
        return PlatformLoginResponse.InvalidAccount;
      }
      return PlatformLoginResponse.PlatformOutage;
    }
    return PlatformLoginResponse.Ok;
  } catch (err) {
    // Apparently login can rethrow as an XRPCError and completely eat the original throw.
    // so errors don't get handled gracefully.
    const errWrap:LooseObj = err as LooseObj;
    if (errWrap.constructor.name === "XRPCError") {
      const errCode = errWrap.status;
      if (errCode == 401) {
        return PlatformLoginResponse.InvalidAccount;
      } else if (errCode >= 500) {
        return PlatformLoginResponse.PlatformOutage;
      }
    }
    console.error(`encountered exception on login for user ${user}, err ${err}`);
  }
  return PlatformLoginResponse.UnhandledError;
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

  const loginResponse:PlatformLoginResponse = await loginToBsky(agent, user, pass);
  if (loginResponse != PlatformLoginResponse.Ok) {
    const addViolation:boolean = await createViolationForUser(env, content.userId, loginResponse);
    if (addViolation)
      console.error(`Unable to login to make repost from user ${content.userId} with violation ${loginResponse}`);
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

  const loginResponse:PlatformLoginResponse = await loginToBsky(agent, user, pass);
  if (loginResponse != PlatformLoginResponse.Ok) {
    const addViolation:boolean = await createViolationForUser(env, content.user, loginResponse);
    if (addViolation)
      console.error(`Unable to login to make post ${content.postid} with violation ${loginResponse}`);
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
    let postRecord:AppBskyFeedPost.Record = {
      $type: 'app.bsky.feed.post',
      text: data,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    };
    if (content.label !== undefined && content.label !== PostLabel.None) {
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

    // Upload any embeds to this post
    if (content.embeds?.length) {
      let imagesArray = [];
      let externalData:LooseObj = {};
      for (; currentEmbedIndex < MAX_EMBEDS && currentEmbedIndex < content.embeds.length; ++currentEmbedIndex) {
        const currentEmbed:EmbedData = content.embeds[currentEmbedIndex];
        const currentEmbedType:EmbedDataType = currentEmbed.type || EmbedDataType.Image;
        if (currentEmbedType == EmbedDataType.Image) {
          const file = await env.R2.get(currentEmbed.content);
          if (file) {
            const imageBlob = await file.blob();
            // Upload the data itself.
            const uploadImg = await agent.uploadBlob(imageBlob, {encoding: file.httpMetadata?.contentType });
            // Handle images. Images will always take precedence over links
            const bskyMetadata:LooseObj = {
              image: uploadImg.data.blob,
              alt: truncate(currentEmbed.alt || "", MAX_ALT_TEXT)
            };
            // Attempt to get the width and height of the image file.
            const sizeResult = await imageDimensionsFromStream(await imageBlob.stream());
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
        } else if (currentEmbedType == EmbedDataType.WebLink && imagesArray.length == 0) {
          // only process links if we have no images.
          externalData.uri = currentEmbed.uri;
          externalData.title = currentEmbed.title;
          externalData.description = currentEmbed.description;
          // Attempt to fetch the thumbnail
          if (!isEmpty(currentEmbed.content)) {
            const thumbnail = await fetch(currentEmbed.content);
            if (thumbnail.ok) {
              const imageBlob = await thumbnail.blob();
              const uploadImg = await agent.uploadBlob(imageBlob, {encoding: thumbnail.headers.get("content-type") || "image/png" });
              externalData.thumb = uploadImg.data.blob;
            }
          }
          break;
        }
      }
      // Push the embed images into the post record.
      if (imagesArray.length > 0) {
        (postRecord as any).embed = {
          "images": imagesArray,
          "$type": "app.bsky.embed.images"
        }
      } else {
        // push the web link as a post
        (postRecord as any).embed = {
          "$type": "app.bsky.embed.external",
          "external": externalData
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