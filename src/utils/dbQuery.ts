import { addHours, isAfter, isEqual } from "date-fns";
import { and, desc, eq, getTableColumns } from "drizzle-orm";
import { BatchItem } from "drizzle-orm/batch";
import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import { Context } from "hono";
import has from "just-has";
import isEmpty from "just-is-empty";
import { v4 as uuidv4, validate as uuidValid } from 'uuid';
import { mediaFiles, posts, repostCounts, reposts } from "../db/app.schema";
import { accounts, users } from "../db/auth.schema";
import { MAX_REPOST_POSTS, MAX_REPOST_RULES_PER_POST } from "../limits";
import {
  BatchQuery,
  CreateObjectResponse, CreatePostQueryResponse,
  EmbedDataType,
  PlatformLoginResponse,
  Post, PostLabel,
  RepostInfo,
  Violation
} from "../types.d";
import { PostSchema } from "../validation/postSchema";
import { RepostSchema } from "../validation/repostSchema";
import { updatePostForGivenUser } from "./db/data";
import { getViolationsForUser, removeViolation, userHasViolations } from "./db/violations";
import { createPostObject, createRepostInfo, floorGivenTime } from "./helpers";
import { deleteEmbedsFromR2 } from "./r2Query";

export const getPostsForUser = async (c: Context): Promise<Post[]|null> => {
  try {
    const userId = c.get("userId");
    if (userId) {
      const db: DrizzleD1Database = drizzle(c.env.DB);
      const results = await db.select({...getTableColumns(posts), repostCount: repostCounts.count})
        .from(posts).where(eq(posts.userId, userId))
        .leftJoin(repostCounts, eq(posts.uuid, repostCounts.uuid))
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
        await removeViolation(c.env, userId, PlatformLoginResponse.InvalidAccount);
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
    return false;
  }

  const db: DrizzleD1Database = drizzle(c.env.DB);
  const postQuery = await db.select().from(posts).where(and(eq(posts.uuid, id), eq(posts.userId, userId))).all();
  if (postQuery.length !== 0) {
    // If the post has not been posted, that means we still have files for it, so
    // delete the files from R2
    if (!postQuery[0].posted) {
      await deleteEmbedsFromR2(c, createPostObject(postQuery[0]).embeds);
      const hasViolations = await userHasViolations(db, userId);
      if (hasViolations) {
        // Remove the media too big violation if it's been given
        await removeViolation(c.env, userId, PlatformLoginResponse.MediaTooBig);
      }
    }

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

  // Create repost metadata
  const scheduleGUID = uuidv4();
  const repostInfo: RepostInfo = createRepostInfo(scheduleGUID, scheduleDate, false, repostData);

  // Create the posts
  const postUUID = uuidv4();
  let dbOperations: BatchItem<"sqlite">[] = [
    db.insert(posts).values({
      content,
      uuid: postUUID,
      postNow: makePostNow,
      scheduledDate: scheduleDate,
      repostInfo: [repostInfo],
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
  const scheduleGUID = uuidv4();
  const repostInfo: RepostInfo = createRepostInfo(scheduleGUID, scheduleDate, true, repostData);

  // Check to see if the post already exists
  // (check also against the userId here as well to avoid cross account data collisions)
  const existingPost = await db.select({id: posts.uuid, date: posts.scheduledDate, curRepostInfo: posts.repostInfo}).from(posts).where(and(
    eq(posts.userId, userId), eq(posts.cid, cid))).limit(1).all();

  const hasExistingPost:boolean = existingPost.length >= 1;
  if (hasExistingPost) {
    postUUID = existingPost[0].id;
    const existingPostDate = existingPost[0].date;
    // Ensure the date asked for is after what the post's schedule date is
    if (!isAfter(scheduleDate, existingPostDate) && !isEqual(scheduledDate, existingPostDate)) {
      return { ok: false, msg: "Scheduled date must be after the initial post's date" };
    }
    // Add repost info object to existing array
    let newRepostInfo:RepostInfo[] = isEmpty(existingPost[0].curRepostInfo) ? [] : existingPost[0].curRepostInfo!;
    if (newRepostInfo.length >= MAX_REPOST_RULES_PER_POST) {
      return {ok: false, msg: `Num of reposts rules for this post has exceeded the limit of ${MAX_REPOST_RULES_PER_POST} rules`};
    }

    newRepostInfo.push(repostInfo);
    // push record update to add to json array
    dbOperations.push(db.update(posts).set({repostInfo: newRepostInfo}).where(and(
      eq(posts.userId, userId), eq(posts.cid, cid))));
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
      content: `Repost of ${url}`,
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
  if (hasExistingPost) {
    const newCount = db.$count(reposts, eq(reposts.uuid, postUUID));
    dbOperations.push(db.update(repostCounts)
    .set({count: newCount})
    .where(eq(repostCounts.uuid, postUUID)));
  }
  else
    dbOperations.push(db.insert(repostCounts).values({uuid: postUUID, count: totalRepostCount}));

  const batchResponse = await db.batch(dbOperations as BatchQuery);
  const success = batchResponse.every((el) => el.success);
  return { ok: success, msg: success ? "success" : "fail" };
};

export const updatePostForUser = async (c: Context, id: string, newData: Object) => {
  const userId = c.get("userId");
  return await updatePostForGivenUser(c, userId, id, newData);
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
  const result = await db.select({...getTableColumns(posts), repostCount: repostCounts.count}).from(posts)
    .where(and(eq(posts.uuid, id), eq(posts.userId, userId)))
    .leftJoin(repostCounts, eq(posts.uuid, repostCounts.uuid))
    .limit(1).all();

  if (!isEmpty(result))
    return createPostObject(result[0]);
  return null;   
};
