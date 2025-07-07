import { Context } from "hono";
import { DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import { and, eq, lte, inArray, desc, count, getTableColumns } from "drizzle-orm";
import { BatchItem } from "drizzle-orm/batch";
import { posts, reposts } from "../db/app.schema";
import { users } from "../db/auth.schema";
import { PostSchema } from "./postSchema";
import { Bindings } from "../types";

import { createPostObject, floorCurrentTime, floorGivenTime } from "./helpers";
import { deleteFromR2 } from "./r2Query";
import { isAfter, addHours } from "date-fns";
import { v4 as uuidv4 } from 'uuid';

export const doesUserExist = async (c: Context, username:string) => {
  const db: DrizzleD1Database = drizzle(c.env.DB);
  const result = await db.select().from(users)
    .where(eq(users.name, username))
    .limit(1).all();
  return result.length > 0;
}

export const doesAdminExist = async (c: Context) => {
  return await doesUserExist(c, "admin");
}

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
        .orderBy(desc(posts.scheduledDate)).all();
    }
  } catch(err) {
    console.error(`Failed to get posts for user, session could not be fetched ${err}`);  
  }
  return null;
};

export const deletePost = async (env: Bindings, id:string) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  const postQuery = await db.select().from(posts).where(eq(posts.uuid, id)).all();
  if (postQuery.length !== 0) {
    // If the post has not been posted, that means we still have files for it, so
    // delete the files from R2
    if (!postQuery[0].posted)
      await deleteFromR2(env, createPostObject(postQuery[0]).embeds);

    await db.delete(posts).where(eq(posts.uuid, id));
    return true;
  }
  return false;
};

export const createPost = async (c: Context, body:any) => {
  const db: DrizzleD1Database = drizzle(c.env.DB);
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

  const postUUID = uuidv4();
  let dbOperations:BatchItem<"sqlite">[] = [
    db.insert(posts).values({
        content,
        uuid: postUUID,
        scheduledDate: scheduleDate,
        embedContent: embeds,
        contentLabel: label,
        userId: c.get("user").id
    })
  ];
  if (repostData) {
    for (var i = 1; i <= repostData.times; ++i) {
      dbOperations.push(db.insert(reposts).values({
        uuid: postUUID,
        scheduledDate: addHours(scheduleDate, i*repostData.hours)
      }));
    }
  }

  // TODO: Check success better here
  await db.batch(dbOperations);
  return { ok: true, postNow: makePostNow, postId: postUUID };
};

export const getAllPostsForCurrentTime = async (env: Bindings) => {
  // Get all scheduled posts for current time
  const db: DrizzleD1Database = drizzle(env.DB);
  const currentTime: Date = floorCurrentTime();

  return await db.select().from(posts)
  .where(and(lte(posts.scheduledDate, currentTime), 
    eq(posts.posted, false)))
    .all();
}

export const getAllRepostsForGivenTime = async (env: Bindings, givenDate: Date) => {
  // Get all scheduled posts for the given time
  const db: DrizzleD1Database = drizzle(env.DB);
  const query = db.select({uuid: reposts.uuid}).from(reposts)
    .where(lte(reposts.scheduledDate, givenDate));
  return await db.select({uri: posts.uri, cid: posts.cid, userId: posts.userId })
    .from(posts)
    .where(inArray(posts.uuid, query))
    .all();
}

export const getAllRepostsForCurrentTime = async (env: Bindings) => {
  return await getAllRepostsForGivenTime(env, floorCurrentTime());
}

export const deleteAllRepostsBeforeCurrentTime = async (env: Bindings) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  const currentTime = floorCurrentTime();
  await db.delete(reposts).where(lte(reposts.scheduledDate, currentTime));
}

export const updatePostData = async (env: Bindings, id: string, newData:Object) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  await db.update(posts).set(newData).where(eq(posts.uuid, id));
}

export const getPostById = async(env: Bindings, id: string) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  return await db.select().from(posts).where(eq(posts.uuid, id)).limit(1).all();
}

export const getBskyUserPassForId = async (env: Bindings, userid: string) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  return await db.select({user: users.username, pass: users.bskyAppPass})
    .from(users)
    .where(eq(users.id, userid))
    .limit(1);
}
