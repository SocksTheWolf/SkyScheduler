import { Context, ExecutionContext } from 'hono';
import { type AppBskyFeedPost, AtpAgent, RichText } from '@atproto/api';
import { Bindings, Post, Repost, PostLabel, EmbedData, PostResponseObject, LooseObj, PlatformLoginResponse, EmbedDataType, ScheduledContext, BskyEmbedWrapper, BskyRecordWrapper } from '../types.d';
import { MAX_ALT_TEXT, MAX_EMBEDS_PER_POST, MAX_POSTED_LENGTH } from '../limits.d';
import { updatePostData, getBskyUserPassForId, createViolationForUser } from './dbQuery';
import { deleteEmbedsFromR2 } from './r2Query';
import { imageDimensionsFromStream } from 'image-dimensions';
import truncate from "just-truncate";
import isEmpty from "just-is-empty";
import has from 'just-has';
import { postRecordURI } from '../validation/regexCases';

export const doesHandleExist = async (user: string) => {
  try {
    const checkHandle = await lookupBskyHandle(user);
    return checkHandle !== null;
  } catch {
    return false;
  }
};

export const lookupBskyHandle = async (user: string) => {
  const lookupRequest = await fetch(`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${user}`, {
    cf: {
      cacheTtlByStatus: {"200-299": 600, 404: 1, "500-599": 0},
      cacheEverything: true,
    }
  });
  if (lookupRequest.ok) {
    const response: any = await lookupRequest.json();
    if (has(response, "did")) {
      return response.did;
    } else {
      return null;
    }
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

export const makePost = async (c: Context|ScheduledContext, content: Post, isQueued: boolean=false) => {
  const env = c.env;
  const newPost: PostResponseObject|null = await makePostRaw(env, content);
  if (newPost !== null) {
    // update post data in the d1
    const postDataUpdate: Promise<void> = updatePostData(env, content.postid, { posted: true, uri: newPost.uri, cid: newPost.cid, 
      content: truncate(content.text, MAX_POSTED_LENGTH), embedContent: [] });
    if (isQueued)
      await postDataUpdate;
    else
      c.executionCtx.waitUntil(postDataUpdate);

    // Delete any embeds if they exist.
    deleteEmbedsFromR2(c, content.embeds, isQueued);
    return true;
  }
  return false;
}

export const makeRepost = async (c: Context|ScheduledContext, content: Repost) => {
  const env = c.env;
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
      let mediaEmbeds: BskyEmbedWrapper = { type: EmbedDataType.None };
      let imagesArray = [];
      let bskyRecordInfo: BskyRecordWrapper = {};
      let embedsProcessed: number = 0;
      const isRecordViolation = (attemptToWrite: EmbedDataType) => {
        return mediaEmbeds.type != EmbedDataType.None && mediaEmbeds.type != attemptToWrite 
        && mediaEmbeds.type != EmbedDataType.Record && attemptToWrite != EmbedDataType.Record;
      }
      // go until we run out of embeds or have hit the amount of embeds per post (+1 because there could be a record with media)
      for (; embedsProcessed < MAX_EMBEDS_PER_POST + 1 && currentEmbedIndex < content.embeds.length; ++currentEmbedIndex, ++embedsProcessed) {
        const currentEmbed: EmbedData = content.embeds[currentEmbedIndex];
        const currentEmbedType: EmbedDataType = currentEmbed.type;

        // If we never saw any record info, and the current type is not record itself, then we're on an overflow and need to back out.
        if (embedsProcessed > MAX_EMBEDS_PER_POST && currentEmbedType != EmbedDataType.Record && isEmpty(bskyRecordInfo)) {
          break;
        }

        // If we have encountered a record violation (illegal mixed media types), then we should stop processing further.
        if (isRecordViolation(currentEmbedType)) {
          console.error(`${content.postid} had a mixed media types of ${mediaEmbeds.type} trying to write ${currentEmbedType}`);
          break;
        }

        // Handle weblinks
        if (currentEmbedType == EmbedDataType.WebLink) {
          let externalData: LooseObj = {
            uri: currentEmbed.uri,
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
          mediaEmbeds = {type: EmbedDataType.WebLink, data: externalData};
          continue;
        } else if (currentEmbedType == EmbedDataType.Record) {
          let changedRecord = false;
          // Write the record type if we don't have one set already 
          // (others can override this and the post will become a record with media instead)
          if (mediaEmbeds.type == EmbedDataType.None) {
            mediaEmbeds.type = EmbedDataType.Record;
            changedRecord = true;
          }

          if (!isEmpty(bskyRecordInfo)) {
            console.warn(`${content.postid} attempted to write two record info objects`);
            continue;
          }

          const {account, type, postid} = postRecordURI.exec(currentEmbed.content)?.groups as {account?: string, type?: string, postid?: string};
          if (account === undefined || type === undefined || postid === undefined) {
            console.error(`Unable to get account, type or post id from ${currentEmbed.content}`);
            // Change the record back.
            if (changedRecord)
                mediaEmbeds.type = EmbedDataType.None;
            continue;
          }
          let typeURI: string = "";
          switch (type) {
            case "feed":
              typeURI = "app.bsky.feed.generator";
            break;
            default:
            case "post":
              typeURI = "app.bsky.feed.post";
            break;
            case "lists":
              typeURI = "app.bsky.graph.list";
            break;
            case "follows":
              typeURI = "app.bsky.graph.follow";
            break;
          }
          // get the did for the account, we are logged in so this should always be a value
          let resolvedDID: string = agent.did!;
          // if the account does not match we need to resolve the did
          // also check to see if the link had a did in it already.
          if (account !== user && account !== resolvedDID) {
            console.log(`need to resolve did for ${account}`);
            const didResponse = await lookupBskyHandle(account);
            if (didResponse === null) {
              console.error(`Unable to resolve did for user ${account}`);
              // Change the record back.
              if (changedRecord)
                mediaEmbeds.type = EmbedDataType.None;
              continue;
            }
            resolvedDID = didResponse;
          }
          // create the uri for the record info
          const uri = `at://${resolvedDID}/${typeURI}/${postid}`;
          // Fetch the record info
          const uriResolve: string[] = [ uri ];
          const resolvePost = await getAgentPostRecords(agent, uriResolve);
          if (resolvePost === null) {
            console.error(`Unable to resolve record information for ${content.postid} with ${uri}`);
            // Change the record back.
            if (changedRecord)
                mediaEmbeds.type = EmbedDataType.None;
            continue;
          }          
          if (resolvePost.length == 0) {
            console.error(`could not resolve cid for post ${uri}`);
            // Change the record back.
            if (changedRecord)
                mediaEmbeds.type = EmbedDataType.None;
            continue;
          }
          // Got the record info, push it to our object.
          bskyRecordInfo = {
            cid: resolvePost[0].cid,
            uri: uri
          }
          continue;
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
          mediaEmbeds = { type: EmbedDataType.Image };

          // Handle videos
        } else if (currentEmbedType == EmbedDataType.Video) {
          const bskyMetadata: LooseObj = {
            blob: uploadFile.data.blob,
            ar: {
              width: currentEmbed.width,
              height: currentEmbed.height
            }
          }
          mediaEmbeds = { type: EmbedDataType.Video, data: bskyMetadata };
          continue;
        }
      }
      // Write the images array
      if (imagesArray.length > 0 && mediaEmbeds.type == EmbedDataType.Image)
        mediaEmbeds.data = imagesArray;

      const writeRecord = () => {
        return {
          "$type": "app.bsky.embed.record",
          "record": {
            "cid": bskyRecordInfo?.cid,
            "uri": bskyRecordInfo?.uri
          }
        }
      };

      const getMediaRecord = () => {
        switch (mediaEmbeds?.type) {
          case EmbedDataType.Image:
          return {
            "$type": "app.bsky.embed.images",
            "images": mediaEmbeds.data
          }
          case EmbedDataType.WebLink:
          return {
            "$type": "app.bsky.embed.external",
            "external": mediaEmbeds.data
          }
          case EmbedDataType.Video:
          return {
            "$type": "app.bsky.embed.video",
            "video": mediaEmbeds.data.blob,
            "aspectRatio": mediaEmbeds.data.ar
          }
          case EmbedDataType.Record:
          return {...writeRecord()};
        }
      };

      // Write a record with media if we have some record info
      const isRecordWithMedia = !isEmpty(bskyRecordInfo) && mediaEmbeds?.type != EmbedDataType.Record;
      if (isRecordWithMedia) {
        (postRecord as any).embed = {
          "$type": "app.bsky.embed.recordWithMedia",
          "media": {...getMediaRecord()},
          "record": {...writeRecord()}
        }
      } else if (mediaEmbeds.type != EmbedDataType.None) {
        // Otherwise, write media regularly.
        (postRecord as any).embed = {...getMediaRecord()}
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

export const getPostRecords = async (records:string[]) => {
  // Access the bsky public API
  const agent = new AtpAgent({
    service: new URL('https://public.api.bsky.app'),
  });
  return await getAgentPostRecords(agent, records);
}

export const getAgentPostRecords = async (agent: AtpAgent, records: string[]) => {
  try
  {
    const response = await agent.app.bsky.feed.getPosts({uris: records});
    if (response.success)
      return response.data.posts;
  } catch(err) {
    console.error(`Unable to get post records for ${records} had error ${err}`);
  }
  return null;
}