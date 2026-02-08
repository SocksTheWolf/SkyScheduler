import { eq, getTableColumns, gt, inArray, isNull, sql } from "drizzle-orm";
import { BatchItem } from "drizzle-orm/batch";
import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import flatten from "just-flatten-it";
import truncate from "just-truncate";
import { mediaFiles, posts, repostCounts, reposts } from "../../db/app.schema";
import { users } from "../../db/auth.schema";
import { MAX_POSTED_LENGTH } from "../../limits";
import { BatchQuery, Bindings, R2BucketObject } from "../../types.d";
import { getAllFilesList } from "../r2Query";
import { addFileListing, getAllMediaOfUser } from "./file";

/** Maintenance operations **/
export const runMaintenanceUpdates = async (env: Bindings) => {
  const db: DrizzleD1Database = drizzle(env.DB);
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
    // it would be nicer to do bulking of this, but the method to do so in drizzle leaves me uneasy (and totally not about to sql inject myself)
    // so we do each query uniquely instead.
    postTruncation.forEach(async item => {
      console.log(`Updating post ${item.id}`);
      await db.update(posts).set({ content: truncate(item.content, MAX_POSTED_LENGTH) }).where(eq(posts.uuid, item.id));
    });
  }

  // push timestamps
  await db.update(posts).set({updatedAt: sql`CURRENT_TIMESTAMP`}).where(isNull(posts.updatedAt));

  // populate existing media table with post data
  const allBucketFiles:R2BucketObject[] = await getAllFilesList(env);
  try {
    for (const bucketFile of allBucketFiles) {
      await addFileListing(env, bucketFile.name, bucketFile.user, bucketFile.date);
    }
  } catch(err) {
    console.error(`Adding file listings got error ${err}`);
  }

  let batchedQueries:BatchItem<"sqlite">[] = []; 
  // Flag if the media file has embed data
  const allUsers = await db.select({id: users.id}).from(users).all();
  for (const user of allUsers) {
    const userMedia = await getAllMediaOfUser(env, user.id);
    batchedQueries.push(db.update(mediaFiles).set({hasPost: true})
      .where(inArray(mediaFiles.fileName, flatten(userMedia))));
  }

  const allPosts = await db.select({id: posts.uuid}).from(posts);
  for (const post of allPosts) {
    const count = db.$count(reposts, eq(reposts.uuid, post.id));
    batchedQueries.push(db.insert(repostCounts).values({uuid: post.id, 
      count: count}).onConflictDoNothing());
  }
  await db.batch(batchedQueries as BatchQuery);
};
