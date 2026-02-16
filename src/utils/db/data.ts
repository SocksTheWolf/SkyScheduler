import { and, asc, desc, eq, inArray, isNotNull, lte, ne, notInArray, sql } from "drizzle-orm";
import { BatchItem } from "drizzle-orm/batch";
import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import isEmpty from "just-is-empty";
import { validate as uuidValid } from 'uuid';
import { posts, repostCounts, reposts, violations } from "../../db/app.schema";
import { MAX_HOLD_DAYS_BEFORE_PURGE, MAX_POSTED_LENGTH } from "../../limits";
import {
  BatchQuery,
  Bindings,
  GetAllPostedBatch,
  Post,
  PostRecordResponse,
  Repost
} from "../../types.d";
import { createPostObject, createRepostObject, floorCurrentTime } from "../helpers";

export const doesPostExist = async (env: Bindings, userId: string, postId: string): Promise<boolean> => {
  if (isEmpty(userId) || !uuidValid(postId))
    return false;

  const db: DrizzleD1Database = drizzle(env.DB);
  const result = await db.select().from(posts).where(and(eq(posts.uuid, postId), eq(posts.userId, userId))).limit(1).all();
  return result.length >= 1;
};

export const getAllPostsForCurrentTime = async (env: Bindings, removeThreads: boolean = false): Promise<Post[]> => {
  // Get all scheduled posts for current time
  const db: DrizzleD1Database = drizzle(env.DB);
  const currentTime: Date = floorCurrentTime();

  const violationUsers = db.select({violators: violations.userId}).from(violations);
  const postsToMake = db.$with('scheduledPosts').as(db.select().from(posts)
  .where(
    and(
      and(
        and(
          eq(posts.posted, false),
          ne(posts.postNow, true) // Ignore any posts that are marked for post now
        ),
        lte(posts.scheduledDate, currentTime)
      ),
      // ignore threads, we'll create this one later.
      removeThreads ? eq(posts.threadOrder, -1) : lte(posts.threadOrder, 0)
    )
  ));
  const results = await db.with(postsToMake).select().from(postsToMake)
    .where(notInArray(postsToMake.userId, violationUsers)).orderBy(asc(postsToMake.createdAt)).all();
  return results.map((item) => createPostObject(item));
};

export const getAllRepostsForGivenTime = async (env: Bindings, givenDate: Date): Promise<Repost[]> => {
  // Get all scheduled posts for the given time
  const db: DrizzleD1Database = drizzle(env.DB);
  const query = db.select({uuid: reposts.uuid}).from(reposts)
    .where(lte(reposts.scheduledDate, givenDate));
  const violationsQuery = db.select({data: violations.userId}).from(violations);
  const results = await db.select({uuid: posts.uuid, uri: posts.uri, cid: posts.cid, userId: posts.userId })
    .from(posts)
    .where(and(inArray(posts.uuid, query), notInArray(posts.userId, violationsQuery)))
    .all();

  return results.map((item) => createRepostObject(item));
};

export const getAllRepostsForCurrentTime = async (env: Bindings): Promise<Repost[]> => {
  return await getAllRepostsForGivenTime(env, floorCurrentTime());
};

export const deleteAllRepostsBeforeCurrentTime = async (env: Bindings) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  const currentTime = floorCurrentTime();
  const deletedPosts = await db.delete(reposts).where(lte(reposts.scheduledDate, currentTime))
    .returning({id: reposts.uuid, scheduleGuid: reposts.scheduleGuid});

  // This is really stupid and I hate it, but someone has to update repost counts once posted
  if (deletedPosts.length > 0) {
    let batchedQueries:BatchItem<"sqlite">[] = [];
    for (const deleted of deletedPosts) {
      // Update counts
      const newCount = db.$count(reposts, eq(reposts.uuid, deleted.id));
      batchedQueries.push(db.update(repostCounts)
        .set({count: newCount})
        .where(eq(repostCounts.uuid, deleted.id)));

      // check if the repost data needs to be killed
      if (!isEmpty(deleted.scheduleGuid)) {
        // do a search to find if there are any reposts with the same scheduleguid.
        // if there are none, this schedule should get removed from the repostInfo array
        const stillHasSchedule = await db.select().from(reposts)
          .where(and(
            eq(reposts.scheduleGuid, deleted.scheduleGuid!),
            eq(reposts.uuid, deleted.id)))
          .limit(1).all();

        // if this is empty, then we need to update the repost info.
        if (isEmpty(stillHasSchedule)) {
          // get the existing repost info to filter out this old data
          const existingRepostInfoArr = (await db.select({repostInfo: posts.repostInfo}).from(posts)
            .where(eq(posts.uuid, deleted.id)).limit(1).all())[0];
          // check to see if there is anything in the repostInfo array
          if (!isEmpty(existingRepostInfoArr)) {
            // create a new array with the deleted out object
            const newRepostInfoArr = existingRepostInfoArr.repostInfo!.filter((obj) => {
              return obj.guid !== deleted.scheduleGuid!;
            });
            // push the new repost info array
            batchedQueries.push(db.update(posts).set({repostInfo: newRepostInfoArr}).where(eq(posts.uuid, deleted.id)));
          }
        }
      }
    }
    await db.batch(batchedQueries as BatchQuery);
  }
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

export const bulkUpdatePostedData = async (env: Bindings, records: PostRecordResponse[], allPosted: boolean) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  let dbOperations: BatchItem<"sqlite">[] = [];

  for (let i = 0; i < records.length; ++i) {
    const record = records[i];
    // skip over invalid records
    if (record.postID === null)
      continue;

    let wasPosted = (i == 0 && !allPosted) ? false : true;
    dbOperations.push(db.update(posts).set(
      {content: sql`substr(posts.content, 0, ${MAX_POSTED_LENGTH+1})`, posted: wasPosted, uri: record.uri, cid: record.cid, embedContent: []})
    .where(eq(posts.uuid, record.postID)));
  }

  if (dbOperations.length > 0)
    await db.batch(dbOperations as BatchQuery);
}

export const setPostNowOffForPost = async (env: Bindings, id: string) => {
  const didUpdate = await updatePostData(env, id, {postNow: false});
  if (!didUpdate)
    console.error(`Unable to set PostNow to off for post ${id}`);
};

export const updatePostForGivenUser = async (env: Bindings, userId: string, id: string, newData: Object) => {
  if (isEmpty(userId) || !uuidValid(id))
    return false;

  const db: DrizzleD1Database = drizzle(env.DB);
  const {success} = await db.update(posts).set(newData).where(and(eq(posts.uuid, id), eq(posts.userId, userId)));
  return success;
};


export const getAllPostedPostsOfUser = async(env: Bindings, userId: string): Promise<GetAllPostedBatch[]> => {
  if (isEmpty(userId))
    return [];

  const db: DrizzleD1Database = drizzle(env.DB);
  return await db.select({id: posts.uuid, uri: posts.uri})
    .from(posts)
    .where(and(eq(posts.userId, userId), eq(posts.posted, true)))
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
};

export const getChildPostsOfThread = async (env: Bindings, rootId: string): Promise<Post[]|null> => {
  if (!uuidValid(rootId))
    return null;

  const db: DrizzleD1Database = drizzle(env.DB);
  const query = await db.select().from(posts)
    .where(and(isNotNull(posts.parentPost), eq(posts.rootPost, rootId)))
    .orderBy(asc(posts.threadOrder), desc(posts.createdAt)).all();
  if (query.length > 0) {
    return query.map((child) => createPostObject(child));
  }
  return null;
};

export const getPostThreadCount = async (env: Bindings, userId: string, rootId: string): Promise<number> => {
  if (!uuidValid(rootId))
    return 0;

  const db: DrizzleD1Database = drizzle(env.DB);
  return await db.$count(posts, and(
    eq(posts.rootPost, rootId),
    eq(posts.userId, userId)));
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
  const dbQuery = await db.select({ data: posts.uuid }).from(posts)
  .leftJoin(repostCounts, eq(posts.uuid, repostCounts.uuid))
  .where(
    and(
      and(
        eq(posts.posted, true), lte(posts.updatedAt, sql`${dateString}`)
      ),
      // skip child posts objects
      and(lte(posts.threadOrder, 0), lte(repostCounts.count, 0))
    )
  ).all();
  const postsToDelete = dbQuery.map((item) => { return item.data });
  if (isEmpty(postsToDelete))
    return 0;

  return await deletePosts(env, postsToDelete);
}
