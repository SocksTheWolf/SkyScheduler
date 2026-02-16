import { type AppBskyFeedPost, AtpAgent, RichText } from '@atproto/api';
import { ResponseType, XRPCError } from '@atproto/xrpc';
import { Context } from 'hono';
import { imageDimensionsFromStream } from 'image-dimensions';
import has from 'just-has';
import isEmpty from "just-is-empty";
import truncate from "just-truncate";
import { BSKY_IMG_SIZE_LIMIT, MAX_ALT_TEXT, MAX_EMBEDS_PER_POST } from '../limits';
import {
  Bindings, BskyEmbedWrapper, BskyRecordWrapper, EmbedData, EmbedDataType,
  LooseObj, Post, PostLabel, AccountStatus,
  PostRecordResponse, PostStatus, Repost, ScheduledContext
} from '../types.d';
import { atpRecordURI } from '../validation/regexCases';
import { bulkUpdatePostedData, getChildPostsOfThread, isPostAlreadyPosted, setPostNowOffForPost } from './db/data';
import { getBskyUserPassForId, getUsernameForUserId } from './db/userinfo';
import { createViolationForUser } from './db/violations';
import { deleteEmbedsFromR2 } from './r2Query';

export const doesHandleExist = async (user: string) => {
  try {
    const checkHandle = await lookupBskyHandle(user);
    return checkHandle !== null;
  } catch {
    return false;
  }
};

export const lookupBskyHandle = async (user: string) : Promise<string|null> => {
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

export const lookupBskyPDS = async (userDID: string) : Promise<string> => {
  const lookupRequest = await fetch(`https://plc.directory/${userDID}`);
  if (lookupRequest.ok) {
    const response: any = await lookupRequest.json();
    if (has(response, "service")) {
      for (const service of response.service) {
        if (service.type === "AtprotoPersonalDataServer") {
          return service.serviceEndpoint;
        }
      }
    }
  }
  // Fallback is to always return the bsky pds
  return "https://bsky.social";
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
            return AccountStatus.Deactivated;
          case "suspended":
            return AccountStatus.Suspended;
          case "takendown":
            return AccountStatus.TakenDown;
        }
        return AccountStatus.InvalidAccount;
      }
      return AccountStatus.PlatformOutage;
    }
    return AccountStatus.Ok;
  } catch (err) {
    // Apparently login can rethrow as an XRPCError and completely eat the original throw.
    // so errors don't get handled gracefully.
    const errWrap: LooseObj = err as LooseObj;
    const errorName = errWrap.constructor.name;
    if (errorName === "XRPCError") {
      const errCode = errWrap.status;
      if (errCode == 401) {
        // app password is bad
        return AccountStatus.InvalidAccount;
      } else if (errCode >= 500) {
        return AccountStatus.PlatformOutage;
      }
    } else if (errorName === "XRPCNotSupported") {
      // handle is bad
      return AccountStatus.InvalidAccount;
    }
    console.error(`encountered exception on login for user ${user}, err ${err}`);
  }
  return AccountStatus.UnhandledError;
}

export const makeAgentForUser = async (env: Bindings, userId: string) => {
  const loginCreds = await getBskyUserPassForId(env, userId);
  if (loginCreds.valid === false) {
    console.error(`credentials for user ${userId} were invalid`);
    return null;
  }
  const {username, password, pds} = loginCreds;
  // Login to bsky
  const agent = new AtpAgent({ service: new URL(pds) });

  const loginResponse: AccountStatus = await loginToBsky(agent, username, password);
  if (loginResponse != AccountStatus.Ok) {
    const addViolation: boolean = await createViolationForUser(env, userId, loginResponse);
    if (addViolation)
      console.error(`Unable to login to ${userId} with violation ${loginResponse}`);
    return null;
  }
  return agent;
}

export const makePost = async (c: Context|ScheduledContext, content: Post|null, usingAgent: AtpAgent|null=null) => {
  if (content === null) {
    console.warn("Dropping invocation of makePost, content was null");
    return false;
  }

  const env = c.env;
  // make a check to see if the post has already been posted onto bsky
  // skip over this check if we are a threaded post, as we could have had a child post that didn't make it.
  if (!content.isThreadRoot && await isPostAlreadyPosted(env, content.postid)) {
    console.log(`Dropped handling make post for post ${content.postid}, already posted.`);
    return true;
  }

  const agent: AtpAgent|null = (usingAgent === null) ? await makeAgentForUser(env, content.user) : usingAgent;
  if (agent === null) {
    console.warn(`could not make agent for post ${content.postid}`);
    return false;
  }

  const newPostRecords: PostStatus|null = await makePostRaw(env, content, agent);
  if (newPostRecords !== null) {
    await bulkUpdatePostedData(env, newPostRecords.records, newPostRecords.expected == newPostRecords.got);

    // Delete any embeds if they exist.
    for (const record of newPostRecords.records) {
      if (record.postID === null)
        continue;

      c.executionCtx.waitUntil(deleteEmbedsFromR2(c, record.embeds, true));
    }

    // if we had a total success, return true.
    return newPostRecords.expected == newPostRecords.got;
  } else if (!content.postNow) {
    console.warn(`Post records for ${content.postid} was null, the schedule post failed`);
  }

  // Turn off the post now flag if we failed.
  if (content.postNow) {
    c.executionCtx.waitUntil(setPostNowOffForPost(env, content.postid));
  }
  return false;
}

export const makeRepost = async (c: Context|ScheduledContext, content: Repost, usingAgent: AtpAgent|null=null) => {
  const env = c.env;
  let bWasSuccess = true;
  const agent: AtpAgent|null = (usingAgent === null) ? await makeAgentForUser(env, content.userId) : usingAgent;
  if (agent === null) {
    console.warn(`could not make agent for repost ${content.postid}`);
    return false;
  }

  try {
    await agent.deleteRepost(content.uri);
  } catch {
    // This probably should not be a warning, and should silently fail.
    // the only thing that actually matters is the object below.
    //console.warn(`failed to unrepost post ${content.uri} with err ${err}`);
  }

  try {
    await agent.repost(content.uri, content.cid);
  } catch(err) {
    console.error(`Failed to repost ${content.uri}, got error ${err}`);
    bWasSuccess = false;
  }

  return bWasSuccess;
};

export const makePostRaw = async (env: Bindings, content: Post, agent: AtpAgent): Promise<PostStatus|null> => {
  const username = await getUsernameForUserId(env, content.user);
  // incredibly unlikely but we'll handle it
  if (username === null) {
    console.warn(`username for post ${content.postid} was invalid`);
    return null;
  }

  // Easy lookup map for reply mapping for this post chain
  const postMap = new Map();

  // Lambda that handles making a post record and submitting it to bsky
  const postSegment = async (postData: Post) => {
    let currentEmbedIndex = 0;

    const rt = new RichText({
      text: postData.text,
    });

    await rt.detectFacets(agent);
    let postRecord: AppBskyFeedPost.Record = {
      $type: 'app.bsky.feed.post',
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    };
    if (postData.label !== undefined && postData.label !== PostLabel.None) {
      let contentValues = [];
      switch (postData.label) {
        case PostLabel.Adult:
          contentValues.push({"val": "porn"});
        break;
        case PostLabel.Graphic:
          contentValues.push({"val": "graphic-media"});
        break;
        case PostLabel.Nudity:
          contentValues.push({"val": "nudity"});
        break;
        case PostLabel.Suggestive:
          contentValues.push({"val": "sexual"});
        break;
        case PostLabel.GraphicAdult:
          contentValues.push({"val": "porn"});
          contentValues.push({"val": "graphic-media"});
        break;
      }
      (postRecord as any).labels = {
        "$type": "com.atproto.label.defs#selfLabels",
        "values": contentValues
      };
    }

    // Upload any embeds to this post
    if (postData.embeds?.length) {
      let mediaEmbeds: BskyEmbedWrapper = { type: EmbedDataType.None };
      let imagesArray = [];
      let bskyRecordInfo: BskyRecordWrapper = {};
      let embedsProcessed: number = 0;
      const isRecordViolation = (attemptToWrite: EmbedDataType) => {
        return mediaEmbeds.type != EmbedDataType.None && mediaEmbeds.type != attemptToWrite
        && mediaEmbeds.type != EmbedDataType.Record && attemptToWrite != EmbedDataType.Record;
      }
      // go until we run out of embeds or have hit the amount of embeds per post (+1 because there could be a record with media)
      for (; embedsProcessed < MAX_EMBEDS_PER_POST + 1 && currentEmbedIndex < postData.embeds.length; ++currentEmbedIndex, ++embedsProcessed) {
        const currentEmbed: EmbedData = postData.embeds[currentEmbedIndex];
        const currentEmbedType: EmbedDataType = currentEmbed.type;

        // If we never saw any record info, and the current type is not record itself, then we're on an overflow and need to back out.
        if (embedsProcessed > MAX_EMBEDS_PER_POST && currentEmbedType != EmbedDataType.Record && isEmpty(bskyRecordInfo)) {
          break;
        }

        // If we have encountered a record violation (illegal mixed media types), then we should stop processing further.
        if (isRecordViolation(currentEmbedType)) {
          console.error(`${postData.postid} had a mixed media types of ${mediaEmbeds.type} trying to write ${currentEmbedType}`);
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
                let imageBlob = await thumbnail.blob();
                let thumbEncode = thumbnail.headers.get("content-type") || "image/png";
                if (imageBlob.size > BSKY_IMG_SIZE_LIMIT) {
                  // Resize the thumbnail because while the blob service will accept
                  // embed thumbnails of any size
                  // it will fail when you try to make the post record, saying the
                  // post record is invalid.
                  const imgTransform = (await env.IMAGES.input(imageBlob.stream())
                    .transform({width: 1280, height: 720, fit: "scale-down"})
                    .output({ format: "image/jpeg", quality: 85 })).response();
                  if (imgTransform.ok) {
                    thumbEncode = "image/jpeg";
                    imageBlob = await imgTransform.blob();
                  } else {
                    throw Error("could not image transform thumbnail");
                  }
                }
                const uploadImg = await agent.uploadBlob(imageBlob, { encoding: thumbEncode });
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
            console.warn(`${postData.postid} attempted to write two record info objects`);
            continue;
          }

          const {account, type, postid} = atpRecordURI.exec(currentEmbed.content)?.groups as {account?: string, type?: string, postid?: string};
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
          }
          // get the did for the account, we are logged in so this should always be a value
          let resolvedDID: string = agent.did!;
          // if the account does not match we need to resolve the did
          // also check to see if the link had a did in it already.
          if (account !== username && account !== resolvedDID) {
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
          let cid: string = "";

          // do the appropriate look ups
          switch (type) {
            case "post": {
              // Fetch the record info
              const uriResolve: string[] = [ uri ];
              const resolvePost = await getAgentPostRecords(agent, uriResolve);
              if (resolvePost === null) {
                console.error(`Unable to resolve record information for ${postData.postid} with ${uri}`);
                // Change the record back.
                if (changedRecord)
                    mediaEmbeds.type = EmbedDataType.None;
                continue;
              }
              if (resolvePost.length !== 0)
                cid = resolvePost[0].cid;
            }
            break;
            case "feed": {
              const resolveFeed = await getAgentFeedRecord(agent, uri);
              if (resolveFeed === null) {
                // Change record back
                if (changedRecord)
                    mediaEmbeds.type = EmbedDataType.None;
                continue;
              }
              cid = resolveFeed.cid;
            }
            break;
            case "lists": {
              const resolveList = await getAgentListRecord(agent, uri);
              if (resolveList === null) {
                // Change record back
                if (changedRecord)
                    mediaEmbeds.type = EmbedDataType.None;
                continue;
              }
              cid = resolveList.cid;
            }
            break;
          }

          // check cid
          if (isEmpty(cid)) {
            console.error(`could not resolve cid for post ${uri}`);
            // Change the record back.
            if (changedRecord)
                mediaEmbeds.type = EmbedDataType.None;
            continue;
          }

          // Got the record info, push it to our object.
          bskyRecordInfo = {
            cid: cid,
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
          if (err instanceof XRPCError) {
            if (err.status === ResponseType.InternalServerError) {
              console.warn(`Encountered internal server error on ${currentEmbed.content} for post ${postData.postid}`);
              return false;
            }
          }
          // Give violation mediaTooBig if the file is too large.
          await createViolationForUser(env, postData.user, AccountStatus.MediaTooBig);
          console.warn(`Unable to upload ${currentEmbed.content} for post ${postData.postid} with err ${err}`);
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

    // set up the thread chain
    if (postData.isChildPost) {
      const rootPostRecord: PostRecordResponse = postMap.get(postData.rootPost!);
      const parentPostRecord: PostRecordResponse = postMap.get(postData.parentPost!);
      if (!isEmpty(rootPostRecord) && !isEmpty(parentPostRecord)) {
        (postRecord as any).reply = {
          "root": {
            "uri": rootPostRecord.uri,
            "cid": rootPostRecord.cid
          },
          "parent": {
            "uri": parentPostRecord.uri,
            "cid": parentPostRecord.cid
          }
        }
      }
    }

    try {
      const response = await agent.post(postRecord);
      postMap.set(postData.postid,
        { ...response,
          embeds: postData.embeds,
          postID: postData.postid
        } as PostRecordResponse);
      console.log(`Posted to Bluesky: ${response.uri}`);
      return true;
    } catch(err) {
      // This will try again in the future, next roundabout.
      console.error(`encountered error while trying to push post ${postData.postid} up to bsky ${err}`);
    }
    return false;
  };

  let successThisRound = 0;
  // Attempt to make the post
  if (!content.posted) {
    if (await postSegment(content) === false)
      return null;
    else
      successThisRound = 1;
  } else if (content.isThreadRoot) {
    // Thread posts with children that fail to be posted will be marked with
    // posted: false in the database, but the cid will be populated.
    //
    // However, our helper code will translate the post object and return
    // that it's actually posted: true
    //
    // Do not recreate the thread root in this scenario
    // push the existing data into the post map
    // so it can be referred to by other child posts.
    //
    // Only do this for thread roots, no one else.
    postMap.set(content.postid,
      { uri: content.uri,
        cid: content.cid,
        postID: content.postid
      } as PostRecordResponse);
  }

  // Assume that we succeeded here (failure returns null)
  let successes = 1;
  let expected = 1;

  // If this is a post thread root
  if (content.isThreadRoot) {
    const childPosts = await getChildPostsOfThread(env, content.postid) || [];
    expected += childPosts.length;
    // get the thread children.
    for (const child of childPosts) {
      // If this post is already posted, we might be trying to restore from a failed state
      if (child.posted) {
        postMap.set(child.postid, {postID: null, uri: child.uri!, cid: child.cid!});
        successes += 1;
        continue;
      }
      // This is the first child post we haven't handled yet, oof.
      const childSuccess = await postSegment(child);
      if (childSuccess === false) {
        console.error(`We encountered errors attempting to post child ${child.postid}, returning what did get posted`);
        break;
      }
      successes += 1;
      successThisRound += 1;
    }
  }

  // Return a nice array for the folks at home
  const returnObj: PostStatus = {
    records: Array.from(postMap.values()).filter((post) => { return post.postID !== null;}),
    expected: expected,
    got: successes
  }
  console.log(`posted ${successes}/${expected}, did ${successThisRound} work units`);

  return returnObj;
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

export const getAgentFeedRecord = async (agent: AtpAgent, feedURI: string) => {
  try {
    const response = await agent.app.bsky.feed.getFeedGenerator({feed: feedURI});
    if (response.success && response.data.isValid) {
      return response.data.view;
    }
  } catch (err) {
    console.error(`Unable to get feed record for ${feedURI} had error ${err}`);
  }
  return null;
}

export const getAgentListRecord = async (agent: AtpAgent, listURI: string) => {
  try {
    const response = await agent.app.bsky.graph.getList({list: listURI, limit: 1});
    if (response.success) {
      return response.data.list;
    }
  } catch(err) {
    console.error(`Unable to resolve list record for ${listURI} had error ${err}`);
  }
  return null;
}