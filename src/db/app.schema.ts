import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { EmbedData, PostLabel } from "../types/posts";
import { RepostInfo } from "../classes/repost";
import { users } from "./auth.schema";

export const posts = sqliteTable('posts', {
  uuid: text('uuid', {mode: 'text'}).primaryKey(),
  content: text('content').notNull(),
  scheduledDate: integer('scheduled_date', { mode: 'timestamp_ms' }).notNull(),
  posted: integer('posted', { mode: 'boolean' }).default(false),
  // This is a flag to help beat any race conditions with our cron jobs
  postNow: integer('postNow', { mode: 'boolean' }).default(false),
  embedContent: text('embedContent', {mode: 'json'}).notNull().$type<EmbedData[]>().default(sql`(json_array())`),
  // Contains the reposting cadence of this post object, actionable rules are in the reposts table
  repostInfo: text('repostInfo', {mode: 'json'}).$type<RepostInfo[]>(),
  // bsky/atproto record information once a post is posted
  uri: text('uri'),
  cid: text('cid'),
  // if this post is a pseudo post (i.e. a repost of anything)
  isRepost: integer('isRepost', { mode: 'boolean' }).default(false),
  rootPost: text('rootPost'),
  parentPost: text('parentPost'),
  threadOrder: integer('threadOrder').default(-1),
  // bsky content labels
  contentLabel: text('contentLabel', {mode: 'text'}).$type<PostLabel>().default(PostLabel.None).notNull(),
  // metadata timestamps
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
  // who created this post
  userId: text("user")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
}, (table) => [
  // finding posts by user
  index("user_idx").on(table.userId),
  // for purging posted posts after a set time
  index("postedUpdate_idx")
    .on(table.updatedAt, table.posted)
    .where(sql`posted = 1`),
  // for reposts of the user
  index("repostOnlyUser_idx")
    .on(table.userId, table.isRepost)
    .where(sql`isRepost = 1`),
  // for db pruning and parity with the PDS
  index("postedUUID_idx").on(table.uuid, table.posted),
  // Querying children
  index("generalThread_idx")
    .on(table.parentPost, table.rootPost)
    .where(sql`parentPost is not NULL`),
  // Updating thread orders
  index("threadOrder_idx")
    .on(table.rootPost, table.threadOrder)
    .where(sql`threadOrder <> -1`),
  // cron job
  index("postNowScheduledDatePosted_idx")
    .on(table.posted, table.scheduledDate, table.postNow)
    .where(sql`posted = 0 and postNow <> 1`),
  // used to lower down the amount of posts that fill up the post table
  index("repostAddOn_idx").on(table.userId, table.cid)
]);

export const reposts = sqliteTable('reposts', {
  // garbage key
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  // reflected post uuid
  uuid: text('post_uuid')
    .notNull()
    .references(() => posts.uuid, {onDelete: "cascade"}),
  scheduledDate: integer('scheduled_date', { mode: 'timestamp_ms' }).notNull(),
  // bunching schedule cadence actions
  scheduleGuid: text('schedule_guid')
}, (table) => [
  // cron queries
  index("repost_scheduledDate_idx").on(table.scheduledDate),
  // used for left joining and matching with posts field
  index("repost_postid_idx").on(table.uuid),
  // used for checking if a schedule still has actions left
  index("repost_scheduleGuid_idx").on(table.scheduleGuid, table.uuid),
  // preventing similar actions from pushing to the table
  unique("repost_noduplicates_idx").on(table.uuid, table.scheduledDate),
]);

// cache table for handling repost counts, without having to scan the entire
// repost table
export const repostCounts = sqliteTable('repostCounts', {
  uuid: text('post_uuid')
    .notNull()
    .references(() => posts.uuid, {onDelete: "cascade"}).primaryKey(),
  count: integer('count').default(0).notNull()
});

// helper bookkeeping to make sure we don't have a ton of abandoned files in R2
export const mediaFiles = sqliteTable('media', {
  fileName: text('file', {mode: 'text'}).primaryKey(),
  hasPost: integer('hasPost', { mode: 'boolean' }).default(false),
  userId: text("user")
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
}, (table) => [
  index("media_oldWithNoPost_idx").on(table.hasPost, table.createdAt).where(sql`hasPost = 0`),
  index("media_userid_idx").on(table.userId)
]);
