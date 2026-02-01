import { addHours, isAfter } from "date-fns";
import {
  and, count, desc, eq, getTableColumns, gt, inArray,
  isNotNull, isNull, lte, ne, notInArray, sql
} from "drizzle-orm";
import { BatchItem } from "drizzle-orm/batch";
import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import { Context } from "hono";
import flatten from "just-flatten-it";
import has from "just-has";
import isEmpty from "just-is-empty";
import truncate from "just-truncate";
import { v4 as uuidv4, validate as uuidValid } from 'uuid';
import { mediaFiles, posts, reposts, violations } from "../db/app.schema";
import { accounts, users } from "../db/auth.schema";
import { MAX_HOLD_DAYS_BEFORE_PURGE, MAX_POSTED_LENGTH } from "../limits.d";
import {
  BatchQuery,
  Bindings, BskyAPILoginCreds, CreateObjectResponse, CreatePostQueryResponse,
  EmbedDataType, GetAllPostedBatch, LooseObj, PlatformLoginResponse,
  Post, PostLabel, R2BucketObject, Repost, ScheduledContext, Violation
} from "../types.d";
import { PostSchema } from "../validation/postSchema";
import { RepostSchema } from "../validation/repostSchema";
import { addFileListing } from "./dbQueryFile";
import {
  createLoginCredsObj, createPostObject, createRepostObject,
  floorCurrentTime, floorGivenTime
} from "./helpers";
import { deleteEmbedsFromR2, getAllFilesList } from "./r2Query";

export const doesUserExist = async (c: Context, username: string) => {
  const db: DrizzleD1Database = drizzle(c.env.DB);
  const result = await db.select().from(users)
    .where(eq(users.username, username))
    .limit(1).all();
  return result.length > 0;
};

export const doesAdminExist = async (c: Context) => {
  const db: DrizzleD1Database = drizzle(c.env.DB);
  const result = await db.select().from(users)
    .where(eq(users.name, "admin"))
    .limit(1).all();
  return result.length > 0;
};

export const getPostsForUser = async (c: Context): Promise<Post[]|null> => {
  try {
    const userId = c.get("userId");
    if (userId) {
      const db: DrizzleD1Database = drizzle(c.env.DB);
      const results = await db.select({
            ...getTableColumns(posts),
            repostCount: count(reposts.uuid) 
        })
        .from(posts).where(eq(posts.userId, userId))
        .leftJoin(reposts, eq(posts.uuid, reposts.uuid))
        .groupBy(posts.uuid)
        .orderBy(desc(posts.scheduledDate), desc(posts.createdAt)).all();
      
      if (isEmpty(results))
        return null;

      return results.map((itm) => createPostObject(itm));
    }
  } catch(err) {
    console.error(`Failed to get posts for user, session could not be fetched ${err}`);  
  }
  return null;
};

export const getAllMediaOfUser = async (env: Bindings, userId: string): Promise<string[]> => {
  const db: DrizzleD1Database = drizzle(env.DB);
  const mediaList = await db.select({embeds: posts.embedContent}).from(posts).where(and(eq(posts.posted, false), eq(posts.userId, userId))).all();
  let messyArray: string[][] = [];
  mediaList.forEach(obj => {
    const postMedia = obj.embeds;
    messyArray.push(postMedia
      .filter(media => media.type == EmbedDataType.Image || media.type == EmbedDataType.Video)
      .map(media => media.content));
  });
  return flatten(messyArray);
};

export const updateUserData = async (c: Context, newData: any): Promise<boolean> => {
  const userId = c.get("userId");
  try {
    if (userId) {
      const db: DrizzleD1Database = drizzle(c.env.DB);
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

      // If we have new data about the username, pds, or password, then clear account invalid violations
      if (has(newData, "bskyAppPass") || has(newData, "username") || has(newData, "pds")) {
        queriesToExecute.push(getViolationDeleteQueryForUser(db, userId));
      }

      if (!isEmpty(newData)) {
        queriesToExecute.push(db.update(users).set(newData)
          .where(eq(users.id, userId)));
      }

      await db.batch(queriesToExecute as BatchQuery);
      return true;
    }
  } catch(err) {
    console.error(`Failed to update new user data for user ${userId}`);
  }
  return false;
};

export const deletePost = async (c: Context, id: string): Promise<boolean> => {
  const userId = c.get("userId");
  if (!userId) {
    console.log("no user data");
    return false;
  }

  const db: DrizzleD1Database = drizzle(c.env.DB);
  const postQuery = await db.select().from(posts).where(and(eq(posts.uuid, id), eq(posts.userId, userId))).all();
  if (postQuery.length !== 0) {
    // If the post has not been posted, that means we still have files for it, so
    // delete the files from R2
    if (!postQuery[0].posted)
      await deleteEmbedsFromR2(c, createPostObject(postQuery[0]).embeds);

    c.executionCtx.waitUntil(db.delete(posts).where(eq(posts.uuid, id)));
    return true;
  }
  return false;
};

export const createPost = async (c: Context, body: any): Promise<CreatePostQueryResponse> => {
  const db: DrizzleD1Database = drizzle(c.env.DB);

  const userId = c.get("userId");
  if (!userId)
    return { ok: false, msg: "Your user session has expired, please login again"};

  const validation = PostSchema.safeParse(body);
  if (!validation.success) {
    return { ok: false, msg: validation.error.toString() };
  }

  const { content, scheduledDate, embeds, label, makePostNow, repostData } = validation.data;
  const scheduleDate = floorGivenTime((makePostNow) ? new Date() : new Date(scheduledDate));

  // Ensure scheduled date is in the future
  if (!isAfter(scheduleDate, new Date()) && !makePostNow) {
    return { ok: false, msg: "Scheduled date must be in the future" };
  }

  // Check if account is in violation
  const hasViolations = await getViolationsForUser(db, userId);
  if (hasViolations.success) {
    if (!isEmpty(hasViolations.results)) {
      const violationData: Violation = (hasViolations.results[0] as Violation);
      if (violationData.tosViolation) {
        return {ok: false, msg: "This account is unable to use SkyScheduler services at this time"};
      } else if (violationData.userPassInvalid) {
        return {ok: false, msg: "The BSky account credentials is invalid, please update these in the settings"};
      }
    }
  }

  // Create the posts
  const postUUID = uuidv4();
  let dbOperations: BatchItem<"sqlite">[] = [
    db.insert(posts).values({
        content,
        uuid: postUUID,
        postNow: makePostNow,
        scheduledDate: scheduleDate,
        embedContent: embeds,
        contentLabel: label || PostLabel.None,
        userId: userId
    })
  ];

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
  if (repostData) {
    for (var i = 1; i <= repostData.times; ++i) {
      dbOperations.push(db.insert(reposts).values({
        uuid: postUUID,
        scheduledDate: addHours(scheduleDate, i*repostData.hours)
      }));
    }
  }

  // Batch the query
  const batchResponse = await db.batch(dbOperations as BatchQuery);
  const success = batchResponse.every((el) => el.success);
  return { ok: success, postNow: makePostNow, postId: postUUID, msg: success ? "success" : "fail" };
};

export const createRepost = async (c: Context, body: any): Promise<CreateObjectResponse> => {
  const db: DrizzleD1Database = drizzle(c.env.DB);

  const userId = c.get("userId");
  if (!userId)
    return { ok: false, msg: "Your user session has expired, please login again"};

  const validation = RepostSchema.safeParse(body);
  if (!validation.success) {
    return { ok: false, msg: validation.error.toString() };
  }
  const { url, uri, cid, scheduledDate, repostData } = validation.data;
  const scheduleDate = floorGivenTime(new Date(scheduledDate));
  const timeNow = new Date();
  
  // Ensure scheduled date is in the future
  if (!isAfter(scheduleDate, timeNow)) {
    return { ok: false, msg: "Scheduled date must be in the future" };
  }

  // Check if account is in violation
  const hasViolations = await getViolationsForUser(db, userId);
  if (hasViolations.success) {
    if (!isEmpty(hasViolations.results)) {
      const violationData: Violation = (hasViolations.results[0] as Violation);
      if (violationData.tosViolation) {
        return {ok: false, msg: "This account is unable to use SkyScheduler services at this time"};
      } else if (violationData.userPassInvalid) {
        return {ok: false, msg: "The BSky account credentials is invalid, please update these in the settings"};
      }
    }
  }

  let postUUID;
  let dbOperations: BatchItem<"sqlite">[] = [];

  // Check to see if the post already exists
  // (check also against the userId here as well to avoid cross account data collisions)
  const existingPost = await db.select({id: posts.uuid}).from(posts).where(and(
    eq(posts.userId, userId), eq(posts.cid, cid))).limit(1).all();

  if (existingPost.length > 1) {
    postUUID = existingPost[0].id;
  } else {
    // Create the post base for this repost
    postUUID = uuidv4();
    dbOperations.push(db.insert(posts).values({
      content: `Repost of ${url}`,
      uuid: postUUID,
      cid: cid,
      uri: uri,
      posted: true,
      isRepost: true,
      scheduledDate: scheduleDate,
      userId: userId
    }));
  }

  // Push initial repost
  dbOperations.push(db.insert(reposts).values({
    uuid: postUUID,
    scheduledDate: scheduleDate
  }));
  
  // Push other repost times if we have them
  if (repostData) {
    for (var i = 1; i <= repostData.times; ++i) {
      dbOperations.push(db.insert(reposts).values({
        uuid: postUUID,
        scheduledDate: addHours(scheduleDate, i*repostData.hours)
      }));
    }
  }
  const batchResponse = await db.batch(dbOperations as BatchQuery);
  const success = batchResponse.every((el) => el.success);
  return { ok: success, msg: success ? "success" : "fail" };
};

export const getAllPostsForCurrentTime = async (env: Bindings): Promise<Post[]> => {
  // Get all scheduled posts for current time
  const db: DrizzleD1Database = drizzle(env.DB);
  const currentTime: Date = floorCurrentTime();

  const violationUsers = db.select({violators: violations.userId}).from(violations);
  const postsToMake = db.$with('scheduledPosts').as(db.select().from(posts)
  .where(
    and(
      and(
        eq(posts.posted, false),
        ne(posts.postNow, true) // Ignore any posts that are marked for post now
      ),
      lte(posts.scheduledDate, currentTime)
    )
  ));
  const results = await db.with(postsToMake).select().from(postsToMake)
    .where(notInArray(postsToMake.userId, violationUsers)).all();
  return results.map((item) => createPostObject(item));
};

export const getAllRepostsForGivenTime = async (env: Bindings, givenDate: Date): Promise<Repost[]> => {
  // Get all scheduled posts for the given time
  const db: DrizzleD1Database = drizzle(env.DB);
  // violations filter
  const violationsQuery = db.select({data: violations.userId}).from(violations);
  // two subqueries to make the db queries less awful to write
  const repostsForTime = db.selectDistinct({uuid: reposts.uuid}).from(reposts)
    .where(lte(reposts.scheduledDate, givenDate)).as('repostsForTime');
  const postData = db.select({uuid: posts.uuid, uri: posts.uri, cid: posts.cid, userId: posts.userId}).from(posts)
    .where(and(notInArray(posts.userId, violationsQuery), eq(posts.posted, true))).as("postData");

  // This incredibly ugly query but scales much better than the original
  const results = await db.select({uuid: postData.uuid, uri: postData.uri, cid: postData.cid, userId: postData.userId})
    .from(repostsForTime)
    .leftJoin(postData, eq(repostsForTime.uuid, postData.uuid))
    .where(isNotNull(postData.cid))
    .all();

  return results.map((item) => createRepostObject(item));
};

export const getAllRepostsForCurrentTime = async (env: Bindings): Promise<Repost[]> => {
  return await getAllRepostsForGivenTime(env, floorCurrentTime());
};

export const deleteAllRepostsBeforeCurrentTime = async (env: Bindings) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  const currentTime = floorCurrentTime();
  await db.delete(reposts).where(lte(reposts.scheduledDate, currentTime));
};

/* This function should only be used by anything that is an internal helper (such as a task)
  Should not be used for standard post modification */
export const updatePostData = async (env: Bindings, id: string, newData: Object): Promise<boolean> => {
  if (!uuidValid(id))
    return false;

  const db: DrizzleD1Database = drizzle(env.DB);
  const {success} = await db.update(posts).set(newData).where(eq(posts.uuid, id));
  return success;
};

export const setPostNowOffForPost = async (env: Bindings, id: string) => {
  const didUpdate = await updatePostData(env, id, {postNow: false});
  if (!didUpdate)
    console.error(`Unable to set PostNow to off for post ${id}`);
};

export const updatePostForUser = async (c: Context, id: string, newData: Object) => {
  const userId = c.get("userId");
  return await updatePostForGivenUser(c, userId, id, newData);
};

export const updatePostForGivenUser = async (c: Context|ScheduledContext, userId: string, id: string, newData: Object) => {
  if (!userId || !uuidValid(id))
    return false;

  const db: DrizzleD1Database = drizzle(c.env.DB);
  const {success} = await db.update(posts).set(newData).where(and(eq(posts.uuid, id), eq(posts.userId, userId)));
  return success;
};

export const getPostById = async(c: Context, id: string): Promise<Post|null> => {
  const userId = c.get("userId");
  if (!userId || !uuidValid(id))
    return null;

  const env = c.env;
  const db: DrizzleD1Database = drizzle(env.DB);
  const result = await db.select().from(posts).where(and(eq(posts.uuid, id), eq(posts.userId, userId))).limit(1).all();
  if (!isEmpty(result))
    return createPostObject(result[0]);
  return null;
};

// used for post editing, acts very similar to getPostsForUser
export const getPostByIdWithReposts = async(c: Context, id: string): Promise<Post|null> => {
  const userId = c.get("userId");
  if (!userId || !uuidValid(id))
    return null;

  const env = c.env;
  const db: DrizzleD1Database = drizzle(env.DB);
  const result = await db.select({
      ...getTableColumns(posts),
      repostCount: count(reposts.uuid) 
    }).from(posts)
    .where(and(eq(posts.uuid, id), eq(posts.userId, userId)))
    .leftJoin(reposts, eq(posts.uuid, reposts.uuid))
    .groupBy(posts.uuid).limit(1).all();

  if (!isEmpty(result))
    return createPostObject(result[0]);
  return null;   
};

export const getBskyUserPassForId = async (env: Bindings, userid: string): Promise<BskyAPILoginCreds> => {
  const db: DrizzleD1Database = drizzle(env.DB);
  const response = await db.select({user: users.username, pass: users.bskyAppPass, pds: users.pds})
    .from(users)
    .where(eq(users.id, userid))
    .limit(1).all();
  return createLoginCredsObj(response[0] || null);
};

export const getUsernameForUser = async (c: Context): Promise<string|null> => {
  const db: DrizzleD1Database = drizzle(c.env.DB);
  const userId = c.get("userId");
  if (!userId)
    return null;

  const result = await db.select({username: users.username}).from(users)
    .where(eq(users.id, userId)).limit(1);
  if (result !== null && result.length > 0)
    return result[0].username;
  return null;
};

// This is a super dumb query that's needed to get around better auth's forgot password system
// because you cannot make the call with just an username, you need to also have the email
// but we never update the email past the original time you first signed up, so instead
// we use big brain tactics to spoof the email
export const getUserEmailForHandle = async (env: Bindings, userhandle: string): Promise<string|null> => {
  const db: DrizzleD1Database = drizzle(env.DB);
  const result = await db.select({email: users.email}).from(users).where(eq(users.username, userhandle)).limit(1);
  if (!isEmpty(result))
    return result[0].email;
  return null;
};

export const getAllPostedPostsOfUser = async(env: Bindings, userid: string): Promise<GetAllPostedBatch[]> => {
  const db: DrizzleD1Database = drizzle(env.DB);
  return await db.select({id: posts.uuid, uri: posts.uri})
    .from(posts)
    .where(and(eq(posts.userId, userid), eq(posts.posted, true)))
    .all();
};

export const getAllPostedPosts = async (env: Bindings): Promise<GetAllPostedBatch[]> => {
  const db: DrizzleD1Database = drizzle(env.DB);
  return await db.select({id: posts.uuid, uri: posts.uri})
    .from(posts)
    .where(eq(posts.posted, true))
    .all();
};

export const isPostAlreadyPosted = async (env: Bindings, postId: string): Promise<boolean> => {
  if (!uuidValid(postId))
    return true;

  const db: DrizzleD1Database = drizzle(env.DB);
  const query = await db.select({posted: posts.posted}).from(posts).where(eq(posts.uuid, postId)).all();
  if (isEmpty(query) || query[0].posted === null) {
    // if the post does not exist, return true anyways
    return true;
  }
  return query[0].posted;
}

// deletes multiple posted posts from a database.
export const deletePosts = async (env: Bindings, postsToDelete: string[]): Promise<number> => {
  // Don't do anything on empty arrays.
  if (isEmpty(postsToDelete))
    return 0;

  const db: DrizzleD1Database = drizzle(env.DB);
  let deleteQueries: BatchItem<"sqlite">[] = [];
  postsToDelete.forEach((itm) => {
    deleteQueries.push(db.delete(posts).where(and(eq(posts.uuid, itm), eq(posts.posted, true))));
  });
  // Batching this should improve db times
  const batchResponse = await db.batch(deleteQueries as BatchQuery);
  // Return the number of items that have been deleted
  return batchResponse.reduce((val, item) => val + item.success, 0);
};

export const purgePostedPosts = async (env: Bindings): Promise<number> => {
  const db: DrizzleD1Database = drizzle(env.DB);
  const dateString = `datetime('now', '-${MAX_HOLD_DAYS_BEFORE_PURGE} days')`;
  const dbQuery = await db.selectDistinct({ data: posts.uuid }).from(posts).leftJoin(reposts, eq(posts.uuid, reposts.uuid))
  .where(
    and(
      and(
        eq(posts.posted, true), lte(posts.updatedAt, sql`${dateString}`)
      ),
      isNull(reposts.uuid)
    )
  ).all();
  const postsToDelete = dbQuery.map((item) => { return item.data });
  return await deletePosts(env, postsToDelete);
}

export const createViolationForUser = async(env: Bindings, userId: string, violationType: PlatformLoginResponse): Promise<boolean> => {
  const NoHandleState: PlatformLoginResponse[] = [PlatformLoginResponse.Ok, PlatformLoginResponse.PlatformOutage, 
    PlatformLoginResponse.None, PlatformLoginResponse.UnhandledError];
  // Don't do anything in these cases
  if (violationType in NoHandleState) {
    console.warn(`createViolationForUser got a not valid add request for user ${userId} with violation ${violationType}`);
    return false;
  }

  const db: DrizzleD1Database = drizzle(env.DB);
  let valuesUpdate:LooseObj = {};
  switch (violationType) {
    case PlatformLoginResponse.InvalidAccount:
      valuesUpdate.userPassInvalid = true;
    break;
    case PlatformLoginResponse.Suspended:
      valuesUpdate.accountSuspended = true;
    break;
    case PlatformLoginResponse.TakenDown:
    case PlatformLoginResponse.Deactivated:
      valuesUpdate.accountGone = true;
    break;
    case PlatformLoginResponse.MediaTooBig:
      valuesUpdate.mediaTooBig = true;
    break;
    default:
      console.warn(`createViolationForUser was not properly handled for ${violationType}`);
      return false;
  }

  const {success} = await db.insert(violations).values({userId: userId, ...valuesUpdate}).onConflictDoUpdate({target: violations.userId, set: valuesUpdate});
  return success;
};

const getViolationDeleteQueryForUser = (db: DrizzleD1Database, userId: string) => {
  return db.delete(violations).where(and(eq(violations.userId, userId), 
    and(ne(violations.tosViolation, true), ne(violations.accountGone, true))));
};

export const clearViolationForUser = async(env: Bindings, userId: string) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  const {success} = await getViolationDeleteQueryForUser(db, userId);
  return success;
};

const getViolationsForUser = async(db: DrizzleD1Database, userId: string) => {
  return await db.select().from(violations).where(eq(violations.userId, userId)).limit(1).run();
};

export const getViolationsForCurrentUser = async(c: Context) => {
  const userId = c.get("userId");
  if (userId) {
    const db: DrizzleD1Database = drizzle(c.env.DB);
    return await getViolationsForUser(db, userId);
  } else {
    return {success: false, results: []};
  }
};

/** Maintenance operations **/
export const runMaintenanceUpdates = async (env: Bindings) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  // Create a posted query that also checks for valid json and content length
  const postedQuery = db.select({
    ...getTableColumns(posts),
    contentLength: sql<number>`length(${posts.content})`.as("conLength"),
    isValidJson: sql<number>`cast(length(${posts.embedContent}) as int)`.as("json"),
    }).from(posts).where(eq(posts.posted, true)).as("postedQuery");
  // Then select from those posts that are too long or have too many characters
  const jsonFix = await db.select({id: postedQuery.uuid}).from(postedQuery).where(gt(postedQuery.isValidJson, 2));
  const postTruncation = await db.select({id: postedQuery.uuid, content: postedQuery.content }).from(postedQuery).where(gt(postedQuery.contentLength, MAX_POSTED_LENGTH));

  // Run the invalid json fix
  if (jsonFix.length > 0) {
    console.log(`Attempting to clean up/empty old JSON data for ${jsonFix.length} posts`);
    let invalidJsonFix:string[] = [];
    jsonFix.forEach(item => { invalidJsonFix.push(item.id)});
    await db.update(posts).set({ embedContent: [] }).where(inArray(posts.uuid, invalidJsonFix));
  }

  // Post truncation
  if (postTruncation.length > 0) {
    console.log(`Attempting to clean up post truncation for ${postTruncation.length} posts`);
    // it would be nicer to do bulking of this, but the method to do so in drizzle leaves me uneasy (and totally not about to sql inject myself)
    // so we do each query uniquely instead.
    postTruncation.forEach(async item => {
      console.log(`Updating post ${item.id}`);
      await db.update(posts).set({ content: truncate(item.content, MAX_POSTED_LENGTH) }).where(eq(posts.uuid, item.id));
    });
  }

  // push timestamps
  await db.update(posts).set({updatedAt: sql`CURRENT_TIMESTAMP`}).where(isNull(posts.updatedAt));

  // populate existing media table with post data
  const allBucketFiles:R2BucketObject[] = await getAllFilesList(env);
  try {
    for (const bucketFile of allBucketFiles) {
      await addFileListing(env, bucketFile.name, bucketFile.user, bucketFile.date);
    }
  } catch(err) {
    console.error(`Adding file listings got error ${err}`);
  }

  let batchedMediaQuery:BatchItem<"sqlite">[] = []; 
  // Flag if the media file has embed data
  const allUsers = await db.select({id: users.id}).from(users).all();
  for (const user of allUsers) {
    const userMedia = await getAllMediaOfUser(env, user.id);
    batchedMediaQuery.push(db.update(mediaFiles).set({hasPost: true})
      .where(inArray(mediaFiles.fileName, flatten(userMedia))));
  }
  await db.batch(batchedMediaQuery as BatchQuery);
};
