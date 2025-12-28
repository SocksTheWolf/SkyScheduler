import { Context } from "hono";
import { DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import { sql, and, gt, eq, lte, inArray, desc, count, getTableColumns, notInArray, ne } from "drizzle-orm";
import { BatchItem } from "drizzle-orm/batch";
import { posts, reposts, violations } from "../db/app.schema";
import { accounts, users } from "../db/auth.schema";
import { PostSchema } from "../validation/postSchema";
import { Bindings, LooseObj, PlatformLoginResponse, PostLabel, Violation } from "../types.d";
import { MAX_POSTED_LENGTH } from "../limits.d";
import { createPostObject, floorCurrentTime, floorGivenTime } from "./helpers";
import { deleteEmbedsFromR2 } from "./r2Query";
import { isAfter, addHours } from "date-fns";
import { v4 as uuidv4 } from 'uuid';
import has from "just-has";
import isEmpty from "just-is-empty";
import flatten from "just-flatten-it";
import truncate from "just-truncate";

type BatchQuery = [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]];

export const doesUserExist = async (c: Context, username: string) => {
  const db: DrizzleD1Database = drizzle(c.env.DB);
  const result = await db.select().from(users)
    .where(eq(users.name, username))
    .limit(1).all();
  return result.length > 0;
};

export const doesAdminExist = async (c: Context) => {
  return await doesUserExist(c, "admin");
};

export const getPostsForUser = async (c: Context) => {
  try {
    const userData = c.get("user");
    if (userData) {
      const db: DrizzleD1Database = drizzle(c.env.DB);
      return await db.select({
            ...getTableColumns(posts),
            repostCount: count(reposts.uuid) 
        })
        .from(posts).where(eq(posts.userId, userData.id))
        .leftJoin(reposts, eq(posts.uuid, reposts.uuid))
        .groupBy(posts.uuid)
        .orderBy(desc(posts.scheduledDate), desc(posts.createdAt)).all();
    }
  } catch(err) {
    console.error(`Failed to get posts for user, session could not be fetched ${err}`);  
  }
  return null;
};

export const getAllMediaOfUser = async (env: Bindings, userId: string) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  const mediaList = await db.select({embeds: posts.embedContent}).from(posts).where(and(eq(posts.posted, false), eq(posts.userId, userId))).all();
  let messyArray:string[][] = [];
  mediaList.forEach(obj => {
    const postMedia = obj.embeds;
    messyArray.push(postMedia.map(media => media.content));
  });
  return flatten(messyArray);
};

export const updateUserData = async (c: Context, newData: any) => {
  const userData = c.get("user");
  try {
    if (userData) {
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
          .where(eq(accounts.userId, userData.id)));
      }

      // If we have new data about the username, pds, or password, then clear account invalid violations
      if (has(newData, "bskyAppPass") || has(newData, "username") || has(newData, "pds")) {
        queriesToExecute.push(getViolationDeleteQueryForUser(db, userData.id));
      }

      if (!isEmpty(newData)) {
        queriesToExecute.push(db.update(users).set(newData)
          .where(eq(users.id, userData.id)));
      }

      await db.batch(queriesToExecute as BatchQuery);
      return true;
    }
  } catch(err) {
    console.error(`Failed to update new user data for user ${userData.id}: ${userData.username}`);
  }
  return false;
};

export const deletePost = async (c: Context, id: string) => {
  const userData = c.get("user");
  if (!userData) {
    console.log("no user data");
    return false;
  }

  const env = c.env;
  const db: DrizzleD1Database = drizzle(env.DB);
  const postQuery = await db.select().from(posts).where(and(eq(posts.uuid, id), eq(posts.userId, userData.id))).all();
  if (postQuery.length !== 0) {
    // If the post has not been posted, that means we still have files for it, so
    // delete the files from R2
    if (!postQuery[0].posted)
      await deleteEmbedsFromR2(env, createPostObject(postQuery[0]).embeds);

    await db.delete(posts).where(eq(posts.uuid, id));
    return true;
  }
  return false;
};

export const createPost = async (c: Context, body: any) => {
  const db: DrizzleD1Database = drizzle(c.env.DB);

  const user = c.get("user");
  if (!user)
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
  const hasViolations = await getViolationsForUser(db, user.id);
  if (hasViolations.success) {
    if (hasViolations.results.length > 0) {
      const violationData:Violation = (hasViolations.results[0] as Violation);
      if (violationData.tosViolation) {
        return {ok: false, msg: "This account is unable to use SkyScheduler services at this time"};
      } else if (violationData.userPassInvalid) {
        return {ok: false, msg: "The BSky account credentials is invalid, please update these in the settings"};
      }
    }
  }

  // Create the posts
  const postUUID = uuidv4();
  let dbOperations:BatchItem<"sqlite">[] = [
    db.insert(posts).values({
        content,
        uuid: postUUID,
        scheduledDate: scheduleDate,
        embedContent: embeds,
        contentLabel: label || PostLabel.None,
        userId: user.id
    })
  ];

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
  return { ok: success, postNow: makePostNow, postId: postUUID };
};

export const getAllPostsForCurrentTime = async (env: Bindings) => {
  // Get all scheduled posts for current time
  const db: DrizzleD1Database = drizzle(env.DB);
  const currentTime: Date = floorCurrentTime();

  const violationUsers = db.select({data: violations.userId}).from(violations);
  return await db.select().from(posts)
  .where(and(and(
    lte(posts.scheduledDate, currentTime), eq(posts.posted, false)),
    notInArray(posts.userId, violationUsers))
    ).all();
};

export const getAllRepostsForGivenTime = async (env: Bindings, givenDate: Date) => {
  // Get all scheduled posts for the given time
  const db: DrizzleD1Database = drizzle(env.DB);
  const query = db.select({uuid: reposts.uuid}).from(reposts)
    .where(lte(reposts.scheduledDate, givenDate));
  const violationsQuery = db.select({data: violations.userId}).from(violations);
  return await db.select({uri: posts.uri, cid: posts.cid, userId: posts.userId })
    .from(posts)
    .where(and(inArray(posts.uuid, query), notInArray(posts.userId, violationsQuery)))
    .all();
};

export const getAllRepostsForCurrentTime = async (env: Bindings) => {
  return await getAllRepostsForGivenTime(env, floorCurrentTime());
};

export const deleteAllRepostsBeforeCurrentTime = async (env: Bindings) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  const currentTime = floorCurrentTime();
  await db.delete(reposts).where(lte(reposts.scheduledDate, currentTime));
};

export const updatePostData = async (env: Bindings, id: string, newData:Object) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  await db.update(posts).set(newData).where(eq(posts.uuid, id));
};

export const updatePostForUser = async (c: Context, id: string, newData:Object) => {
  const userData = c.get("user");
  if (!userData)
    return false;

  const db: DrizzleD1Database = drizzle(c.env.DB);
  const {success} = await db.update(posts).set(newData).where(and(eq(posts.uuid, id), eq(posts.userId, userData.id)));
  return success;
};

export const getPostById = async(c: Context, id: string) => {
  const userData = c.get("user");
  if (!userData)
    return [];

  const env = c.env;
  const db: DrizzleD1Database = drizzle(env.DB);
  return await db.select().from(posts).where(and(eq(posts.uuid, id), eq(posts.userId, userData.id))).limit(1).all();
};

export const getBskyUserPassForId = async (env: Bindings, userid: string) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  return await db.select({user: users.username, pass: users.bskyAppPass, pds: users.pds})
    .from(users)
    .where(eq(users.id, userid))
    .limit(1);
};

export const getUserEmailForHandle = async (env: Bindings, userhandle: string) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  return await db.select({email: users.email}).from(users).where(eq(users.username, userhandle)).limit(1);
};

export const getAllPostedPostsOfUser = async(env: Bindings, userid: string) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  return await db.select({id: posts.uuid, uri: posts.uri})
    .from(posts)
    .where(and(eq(posts.userId, userid), eq(posts.posted, true)))
    .all();
};

export const getAllPostedPosts = async (env: Bindings) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  return await db.select({id: posts.uuid, uri: posts.uri})
    .from(posts)
    .where(eq(posts.posted, true))
    .all();
};

// deletes multiple posts from a database.
export const deletePosts = async (env: Bindings, postsToDelete: string[]) => {
  // Don't do anything on empty arrays.
  if (isEmpty(postsToDelete))
    return;

  const db: DrizzleD1Database = drizzle(env.DB);
  await db.delete(posts).where(and(inArray(posts.uuid, postsToDelete), eq(posts.posted, true)));
};

export const compactPostedPosts = async (env: Bindings) => {
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
      await db.update(posts).set({ content: truncate(item.content, MAX_POSTED_LENGTH) }).where(eq(posts.uuid, item.id));
    });
  }
};

export const createViolationForUser = async(env: Bindings, userId: string, violationType: PlatformLoginResponse) => {
  const NoHandleState:PlatformLoginResponse[] = [PlatformLoginResponse.Ok, PlatformLoginResponse.PlatformOutage, PlatformLoginResponse.None, PlatformLoginResponse.UnhandledError];
  // Don't do anything in these cases
  if (violationType in NoHandleState) {
    console.warn(`createViolationForUser got a not valid add request for user ${userId} with violation ${violationType}`);
    return false;
  }

  const db: DrizzleD1Database = drizzle(env.DB);
  let valuesUpdate:LooseObj = {};
  switch (violationType)
  {
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
  const userData = c.get("user");
  if (userData) {
    const db: DrizzleD1Database = drizzle(c.env.DB);
    return await getViolationsForUser(db, userData.id);
  } else {
    return {success: false, results: []};
  }
};