import { and, eq, inArray, lte } from "drizzle-orm";
import flatten from "just-flatten-it";
import { mediaFiles, posts } from "../../db/app.schema";
import type { AllContext, DBProcessor, FileListingRecord, UserIdType } from "../../types";
import { daysAgo, isAltEditableType } from "../helpers";

export const isMediaOwnedByUser = async (c: AllContext, file: string): Promise<boolean> => {
  const db: DBProcessor = c.get("db");
  if (!db) {
    console.error(`unable to check ownership of file ${file}, db was null`);
    return false;
  }

  const userId: UserIdType = c.get("userId");
  if (userId == null) {
    return false;
  }

  const result = await db.select().from(mediaFiles).where(
    and(eq(mediaFiles.userId, userId), eq(mediaFiles.fileName, file)))
    .limit(1).all();
  return result.length > 0;
};

export const addFileListing = async (c: AllContext, file: string, user: UserIdType, createDate: Date|null=null) => {
  const db: DBProcessor = c.get("db");
  if (!db) {
    console.error(`unable to create file listing for file ${file}, db was null`);
    return;
  }
  const insertData: FileListingRecord = {};
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
  const db: DBProcessor = c.get("db");
  if (!db) {
    console.error(`unable to delete file listings ${files.toString()}, db was null`);
    return;
  }
  const filesToDelete = [];
  filesToDelete.push(files);
  const filesToWorkOn = flatten(filesToDelete);
  await db.delete(mediaFiles).where(inArray(mediaFiles.fileName, filesToWorkOn));
};

export const getAllAbandonedMedia = async(c: AllContext): Promise<string[]> => {
  const db: DBProcessor = c.get("db");
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

export const getAllMediaOfUser = async (c: AllContext, userId: UserIdType): Promise<string[]> => {
  const db: DBProcessor = c.get("db");
  if (!db || !userId) {
    console.warn(`could not get all media of user ${userId}, db was null`);
    return [];
  }
  const mediaList = await db.select({embeds: posts.embedContent}).from(posts)
    .where(and(eq(posts.posted, false), eq(posts.userId, userId))).all();

  const messyArray: string[][] = [];
  mediaList.forEach(obj => {
    const postMedia = obj.embeds;
    messyArray.push(postMedia
      .filter(media => isAltEditableType(media.type))
      .map(media => media.content));
  });
  return flatten(messyArray);
};