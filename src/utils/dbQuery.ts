import { addHours, isAfter, isEqual } from "date-fns";
import { and, asc, desc, eq, getTableColumns, gt, gte, ne, sql } from "drizzle-orm";
import { BatchItem } from "drizzle-orm/batch";
import { DrizzleD1Database } from "drizzle-orm/d1";
import has from "just-has";
import isEmpty from "just-is-empty";
import { v4 as uuidv4, validate as uuidValid } from 'uuid';
import { Post } from "../classes/post";
import { RepostInfo } from "../classes/repost";
import { mediaFiles, posts, repostCounts, reposts } from "../db/app.schema";
import { accounts, users } from "../db/auth.schema";
import { MAX_POSTS_PER_THREAD, MAX_REPOST_POSTS, MAX_REPOST_RULES_PER_POST } from "../limits";
import { APP_NAME } from "../siteinfo";
import {
  AccountStatus,
  AllContext,
  BatchQuery,
  CreateObjectResponse, CreatePostQueryResponse,
  DeleteResponse,
  EmbedDataType,
  PostLabel
} from "../types";
import { PostSchema } from "../validation/postSchema";
import { RepostSchema } from "../validation/repostSchema";
import { getChildPostsOfThread, getPostByCID, getPostThreadCount, updatePostForGivenUser } from "./db/data";
import { getViolationsForUser, removeViolation, removeViolations, userHasViolations } from "./db/violations";
import { floorGivenTime } from "./helpers";
import { deleteEmbedsFromR2 } from "./r2Query";

export const getPostsForUser = async (c: AllContext): Promise<Post[]|null> => {
  try {
    const userId = c.get("userId");
    const db: DrizzleD1Database = c.get("db");
    if (userId && db) {
      const results = await db.select({
          ...getTableColumns(posts),
          repostCount: repostCounts.count
        })
        .from(posts).where(eq(posts.userId, userId))
        .leftJoin(repostCounts, eq(posts.uuid, repostCounts.uuid))
        .orderBy(desc(posts.scheduledDate), asc(posts.threadOrder), desc(posts.createdAt)).all();

      if (isEmpty(results))
        return null;

      return results.map((itm) => new Post(itm));
    }
  } catch(err) {
    console.error(`Failed to get posts for user, session could not be fetched ${err}`);
  }
  return null;
};

export const updateUserData = async (c: AllContext, newData: any): Promise<boolean> => {
  const userId = c.get("userId");
  const db: DrizzleD1Database = c.get("db");
  try {
    if (!db) {
      console.error("Unable to update user data, no database object");
      return false;
    }
    if (userId) {
      let queriesToExecute:BatchItem<"sqlite">[] = [];

      if (has(newData, "password")) {
        // cache out the new hash
        const newPassword = newData.password;
        // remove it from the original object
        delete newData.password;

        // add the query to the db batch object
        queriesToExecute.push(db.update(accounts)
          .set({password: newPassword})
          .where(eq(accounts.userId, userId)));
      }

      // If we have new data about the username, pds, or password
      if (has(newData, "bskyAppPass") || has(newData, "username") || has(newData, "pds")) {
        // check if the user has violations
        if (await userHasViolations(db, userId)) {
          // they do, so clear them out
          await removeViolations(c, userId, [AccountStatus.InvalidAccount, AccountStatus.Deactivated]);
        }
      }

      if (!isEmpty(newData)) {
        queriesToExecute.push(db.update(users).set(newData)
          .where(eq(users.id, userId)));
      }

      if (queriesToExecute.length > 0)
        await db.batch(queriesToExecute as BatchQuery);
      return true;
    }
  } catch(err) {
    console.error(`Failed to update new user data for user ${userId}`);
  }
  return false;
};

export const deletePost = async (c: AllContext, id: string): Promise<DeleteResponse> => {
  const userId = c.get("userId");
  const returnObj: DeleteResponse = {success: false, isRepost: false};
  if (!userId) {
    return returnObj;
  }

  const db: DrizzleD1Database = c.get("db");
  if (!db) {
    console.error(`unable to delete post ${id}, db was null`);
    return returnObj;
  }

  const postObj = await getPostById(c, id);
  if (postObj !== null) {
    let queriesToExecute: BatchItem<"sqlite">[] = [];
    // If the post has not been posted, that means we still have files for it, so
    // delete the files from R2
    if (!postObj.posted) {
      await deleteEmbedsFromR2(c, postObj.embeds);
      if (await userHasViolations(db, userId)) {
        // Remove the media too big violation if it's been given
        await removeViolation(c, userId, AccountStatus.MediaTooBig);
      }
    }
    returnObj.isRepost = postObj.isRepost || false;

    // If the parent post is not null, then attempt to find and update the post chain
    const parentPost = postObj.parentPost;
    if (parentPost !== undefined) {
      // set anyone who had this as their parent to this post chain
      queriesToExecute.push(db.update(posts).set({parentPost: parentPost, threadOrder: postObj.threadOrder})
        .where(and(eq(posts.parentPost, postObj.postid), eq(posts.rootPost, postObj.rootPost!))));

      // Update the post order past here
      queriesToExecute.push(db.update(posts).set({threadOrder: sql`threadOrder - 1`})
      .where(
        and(and(eq(posts.rootPost, postObj.rootPost!), ne(posts.threadOrder, -1)), gt(posts.threadOrder, postObj.threadOrder)
      )));
    }

    // We'll need to delete all of the child embeds then, a costly, annoying experience.
    if (postObj.isThreadRoot) {
      const childPosts = await getChildPostsOfThread(c, postObj.postid);
      if (childPosts !== null) {
        for (const childPost of childPosts) {
          c.executionCtx.waitUntil(deleteEmbedsFromR2(c, childPost.embeds));
          queriesToExecute.push(db.delete(posts).where(eq(posts.uuid, childPost.postid)));
        }
      } else {
        console.warn(`could not get child posts of thread ${postObj.postid} during delete`);
      }
    } else if (postObj.isChildPost) {
      // this is not a thread root, so we should figure out how many children are left.
      const childPostCount = (await getPostThreadCount(db, postObj.user, postObj.rootPost!)) - 1;
      if (childPostCount <= 0) {
        queriesToExecute.push(db.update(posts).set({threadOrder: -1}).where(eq(posts.uuid, postObj.rootPost!)));
      }
    }

    // delete post
    queriesToExecute.push(db.delete(posts).where(eq(posts.uuid, id)));
    await c.executionCtx.waitUntil(db.batch(queriesToExecute as BatchQuery));
    returnObj.success = true;
    returnObj.needsRefresh = postObj.isThreadRoot;
  }
  return returnObj;
};

export const createPost = async (c: AllContext, body: any): Promise<CreatePostQueryResponse> => {
  const db: DrizzleD1Database = c.get("db");
  const userId = c.get("userId");
  if (!userId)
    return { ok: false, msg: "Your user session has expired, please login again"};

  if (!db) {
    console.error("unable to create post, db became null");
    return { ok: false, msg: "An application error has occurred please refresh" };
  }

  const validation = PostSchema.safeParse(body);
  if (!validation.success) {
    return { ok: false, msg: validation.error.toString() };
  }

  const { content, scheduledDate, embeds, label, makePostNow, repostData, rootPost, parentPost } = validation.data;
  const scheduleDate = floorGivenTime((makePostNow) ? new Date() : new Date(scheduledDate));

  // Ensure scheduled date is in the future
  //
  // Do not do this check if you are doing a threaded post
  // or you have marked that you are posting right now.
  if (!isAfter(scheduleDate, new Date()) &&
    (!makePostNow && (isEmpty(rootPost) && isEmpty(parentPost)))) {
    return { ok: false, msg: "Scheduled date must be in the future" };
  }

  // Check if account is in violation
  const violationData = await getViolationsForUser(db, userId);
  if (violationData != null) {
    if (violationData.tosViolation) {
      return {ok: false, msg: `This account is unable to use ${APP_NAME} services at this time`};
    } else if (violationData.userPassInvalid) {
      return {ok: false, msg: "The BSky account credentials is invalid, please update these in the settings"};
    }
  }

  // Check to see if this post already exists for thread
  let rootPostID:string|undefined = undefined;
  let parentPostID:string|undefined = undefined;
  let rootPostData: Post|null = null;
  let parentPostOrder: number = 0;
  if (uuidValid(rootPost)) {
    // returns null if the post doesn't appear on this account
    rootPostData = await getPostById(c, rootPost!);
    if (rootPostData !== null) {
      if (rootPostData.posted) {
        return { ok: false, msg: "You cannot make threads off already posted posts"};
      }
      if (rootPostData.isChildPost) {
        return { ok: false, msg: "Subthreads of threads are not allowed." };
      }
      if (rootPostData.isRepost) {
        return {ok: false, msg: "Threads cannot be made of repost actions"};
      }
      rootPostID = rootPostData.rootPost || rootPostData.postid;
      // If this isn't a direct reply, check directly underneath it
      if (rootPost !== parentPost) {
        if (uuidValid(parentPost)) {
          const parentPostData = await getPostById(c, parentPost!);
          if (parentPostData !== null) {
            parentPostID = parentPost!;
            parentPostOrder = parentPostData.threadOrder + 1;
          } else {
            return { ok: false, msg: "The given parent post cannot be found on your account"};
          }
        } else {
          return { ok: false, msg: "The given parent post is invalid"};
        }
      } else {
        parentPostID = rootPostData.postid;
        parentPostOrder = 1; // Root will always be 0, so if this is root, go 1 up.
      }
    } else {
      return { ok: false, msg: "The given root post cannot be found on your account"};
    }
  }

  const isThreadedPost: boolean = (rootPostID !== undefined && parentPostID !== undefined);
  if (isThreadedPost) {
    const threadCount: number = await getPostThreadCount(db, userId, rootPostID!);
    if (threadCount >= MAX_POSTS_PER_THREAD) {
      return { ok: false, msg: `this thread has hit the limit of ${MAX_POSTS_PER_THREAD} posts per thread`};
    }
  }

  // Create repost metadata
  const scheduleGUID = (!isThreadedPost) ? uuidv4() : undefined;
  const repostInfo = (!isThreadedPost) ?
    new RepostInfo(scheduleGUID!, scheduleDate, false, repostData) : undefined;

  // Create the posts
  const postUUID = uuidv4();
  let dbOperations: BatchItem<"sqlite">[] = [];

  // if we're threaded, insert our post before the given parent
  if (isThreadedPost) {
    // Update the parent to our new post
    dbOperations.push(db.update(posts).set({parentPost: postUUID })
      .where(and(eq(posts.parentPost, parentPostID!), eq(posts.rootPost, rootPostID!))));

    // update all posts past this one to also update their order (we will take their id)
    dbOperations.push(db.update(posts).set({threadOrder: sql`threadOrder + 1`})
      .where(
        and(and(eq(posts.rootPost, rootPostID!), ne(posts.threadOrder, -1)), gte(posts.threadOrder, parentPostOrder)
    )));

    // Update the root post so that it has the correct flags set on it as well.
    if (rootPostData!.isThreadRoot == false) {
      dbOperations.push(db.update(posts).set({threadOrder: 0, rootPost: rootPostData!.postid})
        .where(eq(posts.uuid, rootPostData!.postid)));
    }
  } else {
    rootPostID = postUUID;
  }

  // Add the post to the DB
  dbOperations.push(db.insert(posts).values({
      content,
      uuid: postUUID,
      postNow: makePostNow,
      scheduledDate: (!isThreadedPost) ? scheduleDate : new Date(rootPostData!.scheduledDate!),
      rootPost: rootPostID,
      parentPost: parentPostID,
      repostInfo: (!isThreadedPost) ? [repostInfo!] : [],
      threadOrder: (!isThreadedPost) ? undefined : parentPostOrder,
      embedContent: embeds,
      contentLabel: label || PostLabel.None,
      userId: userId
    }));

  if (!isEmpty(embeds)) {
    // Loop through all data within an embed blob so we can mark it as posted
    for (const embed of embeds!) {
      if (embed.type === EmbedDataType.Image || embed.type === EmbedDataType.Video) {
        dbOperations.push(
          db.update(mediaFiles).set({hasPost: true}).where(eq(mediaFiles.fileName, embed.content)));
      }
    }
  }

  // Add repost data to the table
  if (repostData && !isThreadedPost) {
    for (var i = 1; i <= repostData.times; ++i) {
      dbOperations.push(db.insert(reposts).values({
        uuid: postUUID,
        scheduleGuid: scheduleGUID,
        scheduledDate: addHours(scheduleDate, i*repostData.hours)
      }));
    }
    // Push the repost counts in
    dbOperations.push(db.insert(repostCounts)
      .values({uuid: postUUID, count: repostData.times}));
  }

  // Batch the query
  const batchResponse = await db.batch(dbOperations as BatchQuery);
  const success = batchResponse.every((el) => el.success);
  return { ok: success, postNow: makePostNow, postId: postUUID, msg: success ? "success" : "fail" };
};

export const createRepost = async (c: AllContext, body: any): Promise<CreateObjectResponse> => {
  const db: DrizzleD1Database = c.get("db");

  const userId = c.get("userId");
  if (!userId)
    return { ok: false, msg: "Your user session has expired, please login again"};

  if (!db) {
    console.error("unable to create repost db became null");
    return {ok: false, msg: "Invalid server operation occurred, please refresh"};
  }

  const validation = RepostSchema.safeParse(body);
  if (!validation.success) {
    return { ok: false, msg: validation.error.toString() };
  }
  const { url, uri, cid, content, scheduledDate, repostData } = validation.data;
  const scheduleDate = floorGivenTime(new Date(scheduledDate));
  const timeNow = new Date();

  // Ensure scheduled date is in the future
  if (!isAfter(scheduleDate, timeNow)) {
    return { ok: false, msg: "Scheduled date must be in the future" };
  }

  // Check if account is in violation
  const violationData = await getViolationsForUser(db, userId);
  if (violationData != null) {
    if (violationData.tosViolation) {
      return {ok: false, msg: `This account is unable to use ${APP_NAME} services at this time`};
    } else if (violationData.userPassInvalid) {
      return {ok: false, msg: "The BSky account credentials is invalid, please update these in the settings"};
    }
  }
  let postUUID;
  let dbOperations: BatchItem<"sqlite">[] = [];
  const scheduleGUID = uuidv4();
  const repostInfo: RepostInfo = new RepostInfo(scheduleGUID, scheduleDate, true, repostData);

  // Check to see if the post already exists
  // (check also against the userId here as well to avoid cross account data collisions)
  const existingPost = await getPostByCID(db, userId, cid);
  if (existingPost !== null) {
    postUUID = existingPost.postid;
    const existingPostDate = existingPost.scheduledDate!;
    // Ensure the date asked for is after what the post's schedule date is
    if (!isAfter(scheduleDate, existingPostDate) && !isEqual(scheduledDate, existingPostDate)) {
      return { ok: false, msg: "Scheduled date must be after the initial post's date" };
    }
    // Make sure this isn't a thread post.
    // We could probably work around this but I don't think it's worth the effort.
    if (existingPost.isChildPost) {
      return {ok: false, msg: "Repost posts cannot be created from child thread posts"};
    }

    // Add repost info object to existing array
    let newRepostInfo: RepostInfo[] = isEmpty(existingPost.repostInfo) ? [] : existingPost.repostInfo!;
    if (newRepostInfo.length >= MAX_REPOST_RULES_PER_POST) {
      return {ok: false, msg: `Num of reposts rules for this post has exceeded the limit of ${MAX_REPOST_RULES_PER_POST} rules`};
    }

    const repostInfoTimeStr = repostInfo.time.toISOString();
    // Check to see if we have an exact repost match.
    // If we do, do not update the repostInfo, as repost table will drop the duplicates for us anyways.
    const isNewInfoNotDuped = (el: any) => {
      if (el.time == repostInfoTimeStr) {
        if (el.count == repostInfo.count) {
          return el.hours != repostInfo.hours;
        }
      }
      return true;
    };
    if (newRepostInfo.every(isNewInfoNotDuped)) {
      newRepostInfo.push(repostInfo);

      // push record update to add to json array
      dbOperations.push(db.update(posts).set({repostInfo: newRepostInfo}).where(and(
        eq(posts.userId, userId), eq(posts.cid, cid))));
    }
  } else {
    // Limit of post reposts on the user's account.
    const accountCurrentReposts = await db.$count(posts, and(eq(posts.userId, userId), eq(posts.isRepost, true)));
    if (MAX_REPOST_POSTS > 0 && accountCurrentReposts >= MAX_REPOST_POSTS) {
      return {ok: false, msg:
        `You've cannot create any more repost posts at this time. Using: (${accountCurrentReposts}/${MAX_REPOST_POSTS}) repost posts`};
    }

    // Create the post base for this repost
    postUUID = uuidv4();
    dbOperations.push(db.insert(posts).values({
      content: !isEmpty(content) ? content! : `Repost of ${url}`,
      uuid: postUUID,
      cid: cid,
      uri: uri,
      posted: true,
      isRepost: true,
      repostInfo: [repostInfo],
      scheduledDate: scheduleDate,
      userId: userId
    }));
  }

  // Push initial repost
  let totalRepostCount = 1;
  dbOperations.push(db.insert(reposts).values({
      uuid: postUUID,
      scheduleGuid: scheduleGUID,
      scheduledDate: scheduleDate
    }).onConflictDoNothing());

  // Push other repost times if we have them
  if (repostData) {
    for (var i = 1; i <= repostData.times; ++i) {
      dbOperations.push(db.insert(reposts).values({
        uuid: postUUID,
        scheduleGuid: scheduleGUID,
        scheduledDate: addHours(scheduleDate, i*repostData.hours)
      }).onConflictDoNothing());
    }
    totalRepostCount += repostData.times;
  }
  // Update repost counts
  if (existingPost !== null) {
    // update existing content posts (but only for reposts, no one else)
    if (existingPost.isRepost && !isEmpty(content)) {
      dbOperations.push(db.update(posts).set({content: content!}).where(eq(posts.uuid, postUUID)));
    }

    // Because there could be conflicts that drop, run a count on the entire list and use the value from that
    const newCount = db.$count(reposts, eq(reposts.uuid, postUUID));
    // we also don't know if the repost count table has repost values for this item, so we should
    // attempt to always insert and update if it already exists
    dbOperations.push(db.insert(repostCounts)
      .values({uuid: postUUID, count: newCount})
      .onConflictDoUpdate({target: repostCounts.uuid, set: {count: newCount}}));
  }
  else {
    // this is a first time repost post, so we know there were no conflicts
    dbOperations.push(db.insert(repostCounts).values({uuid: postUUID, count: totalRepostCount}));
  }

  const batchResponse = await db.batch(dbOperations as BatchQuery);
  const success = batchResponse.every((el) => el.success);
  return { ok: success, msg: success ? "success" : "fail", postId: postUUID };
};

export const updatePostForUser = async (c: AllContext, id: string, newData: Object): Promise<boolean> => {
  const userId = c.get("userId");
  return await updatePostForGivenUser(c, userId, id, newData);
};

export const getPostById = async(c: AllContext, id: string): Promise<Post|null> => {
  const userId = c.get("userId");
  if (!userId || !uuidValid(id))
    return null;

  const db: DrizzleD1Database = c.get("db");
  if (!db) {
    console.error(`unable to get post ${id}, db was null`);
    return null;
  }

  const result = await db.select().from(posts)
    .where(and(eq(posts.uuid, id), eq(posts.userId, userId)))
    .limit(1).all();

  if (!isEmpty(result))
    return new Post(result[0]);
  return null;
};

// used for post editing, acts very similar to getPostsForUser
export const getPostByIdWithReposts = async(c: AllContext, id: string): Promise<Post|null> => {
  const userId = c.get("userId");
  if (!userId || !uuidValid(id))
    return null;

  const db: DrizzleD1Database = c.get("db");
  if (!db) {
    console.error(`unable to get post ${id} with reposts, db was null`);
    return null;
  }

  const result = await db.select({
    ...getTableColumns(posts),
    repostCount: repostCounts.count,
    }).from(posts)
      .where(and(eq(posts.uuid, id), eq(posts.userId, userId)))
      .leftJoin(repostCounts, eq(posts.uuid, repostCounts.uuid))
      .limit(1).all();

  if (!isEmpty(result))
    return new Post(result[0]);
  return null;
};
