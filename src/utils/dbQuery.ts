import { DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import { posts } from "../db/schema";
import { and, eq, lte, desc } from "drizzle-orm";
import { Bindings } from "../types";
import { createPostObject } from "./helpers";
import { deleteFromR2 } from "./r2Query";
import { isAfter } from "date-fns";
import { PostSchema } from "./postSchema";
import { v4 as uuidv4 } from 'uuid';

export const getPostsForUser = async (env: Bindings, usr:string="") => {
  const db: DrizzleD1Database = drizzle(env.DB);
  return await db.select().from(posts).orderBy(desc(posts.scheduledDate)).all();
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

export const createPost = async (env: Bindings, body:any) => {
  const db: DrizzleD1Database = drizzle(env.DB);
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
    contentLabel: label
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

export const updatePostData = async (env: Bindings, id: string, newData:Object) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  await db.update(posts).set(newData).where(eq(posts.uuid, id));
}