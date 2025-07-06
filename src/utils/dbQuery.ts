import { DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import { posts, reposts } from "../db/app.schema";
import { users } from "../db/auth.schema";
import { and, eq, lte, desc } from "drizzle-orm";
import { Bindings } from "../types";
import { createPostObject } from "./helpers";
import { deleteFromR2 } from "./r2Query";
import { isAfter } from "date-fns";
import { PostSchema } from "./postSchema";
import { v4 as uuidv4 } from 'uuid';
import { Context } from "hono";

export const doesAdminExist = async (c: Context) => {
  const db: DrizzleD1Database = drizzle(c.env.DB);
  const result = await db.select().from(users).where(eq(users.name, "admin")).limit(1).all();
  return result.length > 0;
}

export const getPostsForUser = async (c: Context) => {
  try {
    const userData = c.get("user");
    if (userData) {
      const db: DrizzleD1Database = drizzle(c.env.DB);
      return await db.select().from(posts).where(eq(posts.userId, userData.id)).orderBy(desc(posts.scheduledDate)).all();
    }
  } catch(err) {
    console.error(`Failed to get posts for user, session could not be fetched ${err}`);  
  }
  return null;
};

export const deletePost = async (env: Bindings, id:string) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  const postQuery = await db.select().from(posts).where(eq(posts.uuid, id)).all();
  // If the post has not been posted, that means we still have files for it, so
  // delete the files from R2
  if (!postQuery[0].posted)
    await deleteFromR2(env, createPostObject(postQuery[0]).embeds);

  await db.delete(posts).where(eq(posts.uuid, id));

  // TODO: This also needs to delete any reposted enqueues.
};

export const createPost = async (c: Context, body:any) => {
  const db: DrizzleD1Database = drizzle(c.env.DB);
  const validation = PostSchema.safeParse(body);
  if (!validation.success) {
    return { ok: false, msg: validation.error.toString() };
  }

  const { content, scheduledDate, embeds, label } = validation.data;
  const scheduleDate = new Date(scheduledDate);

  // Ensure scheduled date is in the future
  if (!isAfter(scheduleDate, new Date())) {
    return { ok: false, msg: "Scheduled date must be in the future" };
  }

  const postUUID = uuidv4();
  await db.insert(posts).values({
    content,
    uuid: postUUID,
    scheduledDate: scheduleDate,
    embedContent: embeds,
    contentLabel: label,
    userId: c.get("user").id
  });
  return { ok: true };
};

export const getAllPostsForCurrentTime = async (env: Bindings) => {
  // Get all scheduled posts for current time
  const db: DrizzleD1Database = drizzle(env.DB);
  const currentTime = new Date();
  // round current time to nearest hour
  currentTime.setMinutes(0, 0, 0);

  return await db.select().from(posts).where(and(lte(posts.scheduledDate, currentTime), eq(posts.posted, false))).all();
}

export const getAllRepostsForCurrentTime = async (env: Bindings) => {
  // Get all scheduled posts for current time
  const db: DrizzleD1Database = drizzle(env.DB);
  const currentTime = new Date();
  // round current time to nearest hour
  currentTime.setMinutes(0, 0, 0);

  const repostBlock = await db.$with("queued").as(db.select({uuid: reposts.uuid}).from(reposts).where(lte(reposts.scheduledDate, currentTime)));
  return await db.with(repostBlock).select({uri: posts.uri, cid: posts.cid, userId: posts.userId}).from(posts).all();
}

export const updatePostData = async (env: Bindings, id: string, newData:Object) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  await db.update(posts).set(newData).where(eq(posts.uuid, id));
}

export const getBskyUserPassForId = async (env: Bindings, userid: string) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  return await db.select({user: users.username, pass: users.bskyAppPass}).from(users).where(eq(users.id, userid)).limit(1);
}
