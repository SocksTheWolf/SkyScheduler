import { and, count, eq, getTableColumns, gt, inArray, isNull, sql } from "drizzle-orm";
import { BatchItem } from "drizzle-orm/batch";
import { DrizzleD1Database } from "drizzle-orm/d1";
import flatten from "just-flatten-it";
import isEmpty from "just-is-empty";
import remove from "just-remove";
import { RepostInfo } from "../../classes/repost";
import { mediaFiles, posts, repostCounts, reposts } from "../../db/app.schema";
import { users } from "../../db/auth.schema";
import { MAX_POSTED_LENGTH } from "../../limits";
import { AllContext, BatchQuery, R2BucketObject } from "../../types";
import { getAllFilesList } from "../r2Query";
import { addFileListing, getAllMediaOfUser } from "./file";

/** Maintenance operations **/
export const runMaintenanceUpdates = async (c: AllContext) => {
  const db: DrizzleD1Database = c.get("db");
  if (!db) {
    console.error("unable to get database to run maintenance");
    return;
  }
  // Create a posted query that also checks for valid json and content length
  const postedQuery = db.select({
    ...getTableColumns(posts),
    contentLength: sql<number>`length(${posts.content})`.as("conLength"),
    isValidJson: sql<number>`cast(length(${posts.embedContent}) as int)`.as("json"),
    }).from(posts).where(eq(posts.posted, true)).as("postedQuery");
  // Then select from those posts that are too long or have too many characters
  const jsonFix = await db.select({id: postedQuery.uuid}).from(postedQuery).where(gt(postedQuery.isValidJson, 2));
  const postTruncation = await db.select({id: postedQuery.uuid, content: postedQuery.content })
    .from(postedQuery).where(gt(postedQuery.contentLength, MAX_POSTED_LENGTH));

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
    for (const item of postTruncation) {
      console.log(`Updating post ${item.id}`);
      await db.update(posts).set({ content: sql`substr(posts.content, 0, ${MAX_POSTED_LENGTH})`}).where(and(eq(posts.uuid, item.id), eq(posts.posted, true)));
    }
  }

  // push timestamps
  await db.update(posts).set({updatedAt: sql`CURRENT_TIMESTAMP`}).where(isNull(posts.updatedAt));

  // populate existing media table with post data
  const allBucketFiles:R2BucketObject[] = await getAllFilesList(c);
  try {
    for (const bucketFile of allBucketFiles) {
      await addFileListing(c, bucketFile.name, bucketFile.user, bucketFile.date);
    }
  } catch(err) {
    console.error(`Adding file listings got error ${err}`);
  }

  let batchedQueries:BatchItem<"sqlite">[] = [];
  // Flag if the media file has embed data
  const allUsers = await db.select({id: users.id}).from(users).all();
  for (const user of allUsers) {
    const userMedia = await getAllMediaOfUser(c, user.id);
    batchedQueries.push(db.update(mediaFiles).set({hasPost: true})
      .where(inArray(mediaFiles.fileName, flatten(userMedia))));
  }

  // clean up post data
  const allPosts = await db.select({id: posts.uuid, info: posts.repostInfo}).from(posts);
  for (const post of allPosts) {
    // Clean up repost counts
    const countHelper = db.$count(reposts, eq(reposts.uuid, post.id));
    batchedQueries.push(db.insert(repostCounts)
      .values({uuid: post.id, count: countHelper})
      .onConflictDoUpdate({target: repostCounts.uuid, set: {count: countHelper}}));

    // Clean up repost info of posts
    // TODO: this doesn't work properly, and I accidentally obliterated my
    // test data, and the bug is already fixed so there's no real reason to keep going with this
    // it'll just be a silly quirk.
    if (!isEmpty(post.info) && false) {
      // this post has repost info
      let repostInfoMap: Map<string, RepostInfo> = new Map();
      post.info!.forEach((itm) => repostInfoMap.set(itm.guid, itm));
      // Keep this too to make sure we worked on all objects, if anything is left over in this array, delete it.
      // could probably do a where not exists but meh
      let repostInfoGuids: string[] = post.info!.map((itm) => itm.guid);

      const repostInfoData = await db.select({id: reposts.scheduleGuid, count: count()}).from(reposts)
            .where(inArray(reposts.scheduleGuid, repostInfoGuids)).all();

      for (const res of repostInfoData) {
        // if the object is empty, remove from the map
        if (res.count == 0) {
          repostInfoMap.delete(res.id!);
        }
        // remove from this array
        repostInfoGuids = remove(repostInfoGuids, [res.id]);
      }
      // delete any records that don't exist
      repostInfoGuids.forEach((itm) => repostInfoMap.delete(itm));
      const newRepostInfo = Array.from(repostInfoMap.values());
      batchedQueries.push(db.update(posts).set({repostInfo: newRepostInfo}).where(eq(posts.uuid, post.id)));
    }
  }

  if (batchedQueries.length > 0)
    await db.batch(batchedQueries as BatchQuery);
};
