import { type AppBskyFeedPost, AtpAgent, RichText } from '@atproto/api';
import { Bindings, Post, Repost, PostLabel, EmbedData, PostResponseObject, LooseObj, PlatformLoginResponse, EmbedDataType } from '../types.d';
import { MAX_ALT_TEXT, MAX_EMBEDS_PER_POST, MAX_POSTED_LENGTH } from '../limits.d';
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
      allowTakendown: true
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

  const loginResponse: PlatformLoginResponse = await loginToBsky(agent, user, pass);
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

type InternalEmbedProcess = {
  type: EmbedDataType;
  data: any;
}

export const makePostRaw = async (env: Bindings, content: Post) => {
  const loginCreds = await getBskyUserPassForId(env, content.user);
  const {user, pass, pds} = loginCreds[0];
  // Login to bsky
  const agent = new AtpAgent({ service: new URL(pds) });

  if (user === null || pass === null) {
    console.error(`The username/pass for userid ${content.user} is invalid!`);
    return null;
  }

  const loginResponse: PlatformLoginResponse = await loginToBsky(agent, user, pass);
  if (loginResponse != PlatformLoginResponse.Ok) {
    const addViolation: boolean = await createViolationForUser(env, content.user, loginResponse);
    if (addViolation)
      console.error(`Unable to login to make post ${content.postid} with violation ${loginResponse}`);
    return null;
  }

  const rt = new RichText({
    text: content.text,
  });

  await rt.detectFacets(agent);

  // This used to be so that we could handle posts in threads, but it turns out that threading is more annoying
  // As if anything fails, you have to roll back pretty hard.
  // So threading is dropped. But here's the code if we wanted to bring it back in the future.
  let currentEmbedIndex = 0; 
  const posts: PostResponseObject[] = [];

  const postSegment = async (data: string) => {
    let postRecord: AppBskyFeedPost.Record = {
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
      let finalEmbed: InternalEmbedProcess|null = null;
      let imagesArray = [];
      let embedsProcessed: number = 0;
      // go until we run out of embeds or have hit the amount of embeds per post
      for (; embedsProcessed < MAX_EMBEDS_PER_POST && currentEmbedIndex < content.embeds.length; ++currentEmbedIndex, ++embedsProcessed) {
        const currentEmbed:EmbedData = content.embeds[currentEmbedIndex];
        const currentEmbedType: EmbedDataType = currentEmbed.type || EmbedDataType.Image;

        // Handle weblinks
        if (currentEmbedType == EmbedDataType.WebLink) {
          let externalData: LooseObj = {
            url: currentEmbed.uri,
            title: currentEmbed.title,
            description: currentEmbed.description
          };

          // Attempt to fetch the thumbnail
          if (!isEmpty(currentEmbed.content)) {
            try {
              const thumbnail = await fetch(currentEmbed.content);
              if (thumbnail.ok) {
                const imageBlob = await thumbnail.blob();
                const thumbEncode = thumbnail.headers.get("content-type") || "image/png";
                const uploadImg = await agent.uploadBlob(imageBlob, {encoding: thumbEncode });
                externalData.thumb = uploadImg.data.blob;
              } else {
                console.warn(`Failed thumbnail for ${currentEmbed.content}, proceeding with no thumb.`);
              }
            } catch(err) {
              console.warn(`Failed to fetch thumbnail ${err} for embed ${currentEmbed.content}, removing thumb`);
            }
          }
          finalEmbed = {type: EmbedDataType.WebLink, data: externalData};
          break;
        }

        // Otherwise pull files from storage
        const file = await env.R2.get(currentEmbed.content);
        if (!file) {
          console.warn(`Could not get the file ${currentEmbed.content} from R2 for post!`);
          return false;
        }
        // Process the file and upload it to the blob service
        const fileBlob = await file.blob();
        let uploadFile = null;
        try {
          uploadFile = await agent.uploadBlob(fileBlob, {encoding: file.httpMetadata?.contentType });
        } catch (err) {
          // TODO: Give violation mediaTooBig if the file is too large.
          console.warn(`Unable to upload ${currentEmbed.content} for post ${content.postid} with err ${err}`);
          return false;
        }

        // if we fail to upload anything, early out entirely.
        if (!uploadFile.success) {
          console.warn(`failed to upload ${currentEmbed.content} to blob service`);
          return false;
        } 

        // Handle images
        if (currentEmbedType == EmbedDataType.Image) {
          // we were able to upload to the blob, go ahead and add the image record to the post
          const bskyMetadata: LooseObj = {
            image: uploadFile.data.blob,
            alt: truncate(currentEmbed.alt || "", MAX_ALT_TEXT)
          };
          // Attempt to get the width and height of the image file.
          const sizeResult = await imageDimensionsFromStream(await fileBlob.stream());
          // If we were able to parse the width and height of the image, 
          // then append the "aspect ratio" into the image record.
          if (sizeResult) {
            bskyMetadata.aspectRatio = {
              "width": sizeResult.width,
              "height": sizeResult.height
            }
          }
          // Push the image data to the array.
          imagesArray.push(bskyMetadata);

          // Handle videos
        } else if (currentEmbedType == EmbedDataType.Video) {
          const bskyMetadata: LooseObj = {
            blob: uploadFile.data.blob,
            ar: {
              width: currentEmbed.width,
              height: currentEmbed.height
            }
          }
          finalEmbed = {type: EmbedDataType.Video, data: bskyMetadata};
          break;
        }
      }
      if (imagesArray.length > 0 && finalEmbed == null)
        finalEmbed = {type: EmbedDataType.Image, data: imagesArray};

      switch (finalEmbed?.type) {
        case EmbedDataType.Image:
        (postRecord as any).embed = {
          "$type": "app.bsky.embed.images",
          "images": finalEmbed.data
        }
        break;
        case EmbedDataType.WebLink:
          (postRecord as any).embed = {
            "$type": "app.bsky.embed.external",
            "external": finalEmbed.data
          }
        break;
        case EmbedDataType.Video:
          (postRecord as any).embed = {
            "$type": "app.bsky.embed.video",
            "video": finalEmbed.data.blob,
            "aspectRatio": finalEmbed.data.ar
          }
        break;
      }
    }

    try {
      const response = await agent.post(postRecord);
      posts.push(response);
      return true;
    } catch(err) {
      // This will try again in the future, next roundabout.
      console.error(`encountered error while trying to push post ${content.postid} up to bsky ${err}`);
    }
    return false;
  };

  // Attempt to make the post
  if (await postSegment(rt.text) === false) {
    return null;
  }

  // Make a note that we posted this to BSky
  console.log(`Posted to Bluesky: ${posts.map(p => p.uri)}`);

  // store the first uri/cid
  return posts[0];
}

export const makePost = async (env: Bindings, content: Post) => {
  const newPost: PostResponseObject|null = await makePostRaw(env, content);
  if (newPost !== null) {
    await updatePostData(env, content.postid, { posted: true, uri: newPost.uri, cid: newPost.cid, 
      content: truncate(content.text, MAX_POSTED_LENGTH), embedContent: [] });

    // Delete any embeds if they exist.
    await deleteEmbedsFromR2(env, content.embeds);
    return true;
  }
  return false;
}

export const getPostRecords = async (records:string[]) => {
  try
  {
    // Access the bsky public API
    const agent = new AtpAgent({
      service: new URL('https://public.api.bsky.app'),
    });

    const response = await agent.app.bsky.feed.getPosts({uris: records});
    if (response.success)
      return response.data.posts;
  } catch(err) {
    console.error(`Unable to get post records for ${records} had error ${err}`);
  }
  return null;
}