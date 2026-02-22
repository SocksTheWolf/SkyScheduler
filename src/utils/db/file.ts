import { and, eq, inArray, lte } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import flatten from "just-flatten-it";
import { mediaFiles, posts } from "../../db/app.schema";
import { EmbedDataType } from "../../types/posts";
import { daysAgo } from "../helpers";

export const addFileListing = async (c: AllContext, file: string, user: string|null, createDate: Date|null=null) => {
  const db: DrizzleD1Database = c.get("db");
  if (!db) {
    console.error(`unable to create file listing for file ${file}, db was null`);
    return;
  }
  let insertData:LooseObj = {};
  if (createDate !== null) {
    insertData.createdAt = createDate;
  }
  if (user !== null) {
    insertData.userId = user;
  }
  await db.insert(mediaFiles).values({fileName: file, ...insertData})
      .onConflictDoNothing({target: mediaFiles.fileName});
};

export const deleteFileListings = async (c: AllContext, files: string|string[]) => {
  const db: DrizzleD1Database = c.get("db");
  if (!db) {
    console.error(`unable to delete file listings ${files}, db was null`);
    return;
  }
  let filesToDelete = [];
  filesToDelete.push(files);
  const filesToWorkOn = flatten(filesToDelete);
  await db.delete(mediaFiles).where(inArray(mediaFiles.fileName, filesToWorkOn));
};

export const getAllAbandonedMedia = async(c: AllContext): Promise<string[]> => {
  const db: DrizzleD1Database = c.get("db");
  if (!db) {
    console.error("could not get all abandoned media, db was null");
    return [];
  }
  if (c.env.R2_SETTINGS.prune_days === undefined) {
    return [];
  }
  const numDaysAgo = daysAgo(c.env.R2_SETTINGS.prune_days);

  const results = await db.select().from(mediaFiles)
    .where(
      and(eq(mediaFiles.hasPost, false), lte(mediaFiles.createdAt, numDaysAgo))
    ).all();

  return results.map((item) => item.fileName);
};

export const getAllMediaOfUser = async (c: AllContext, userId: string): Promise<string[]> => {
  const db: DrizzleD1Database = c.get("db");
  if (!db) {
    console.warn(`could not get all media of user ${userId}, db was null`);
    return [];
  }
  const mediaList = await db.select({embeds: posts.embedContent}).from(posts)
    .where(and(eq(posts.posted, false), eq(posts.userId, userId))).all();

  let messyArray: string[][] = [];
  mediaList.forEach(obj => {
    const postMedia = obj.embeds;
    messyArray.push(postMedia
      .filter(media => media.type == EmbedDataType.Image || media.type == EmbedDataType.Video)
      .map(media => media.content));
  });
  return flatten(messyArray);
};