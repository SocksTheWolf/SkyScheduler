import { and, eq, inArray, lte } from "drizzle-orm";
import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import flatten from "just-flatten-it";
import { mediaFiles, posts } from "../../db/app.schema";
import { Bindings, EmbedDataType, LooseObj } from "../../types.d";
import { daysAgo } from "../helpers";

export const addFileListing = async (env: Bindings, file: string, user: string|null, createDate: Date|null=null) => {
  const db: DrizzleD1Database = drizzle(env.DB);
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

export const deleteFileListings = async (env: Bindings, files: string|string[]) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  let filesToDelete = [];
  filesToDelete.push(files);
  const filesToWorkOn = flatten(filesToDelete);
  await db.delete(mediaFiles).where(inArray(mediaFiles.fileName, filesToWorkOn));
};

export const getAllAbandonedMedia = async(env: Bindings) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  const numDaysAgo = daysAgo(env.R2_SETTINGS.prune_days);

  const results = await db.select().from(mediaFiles)
    .where(
      and(eq(mediaFiles.hasPost, false), lte(mediaFiles.createdAt, numDaysAgo))
    ).all();
  
  return results.map((item) => item.fileName);
};

export const getAllMediaOfUser = async (env: Bindings, userId: string): Promise<string[]> => {
  const db: DrizzleD1Database = drizzle(env.DB);
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