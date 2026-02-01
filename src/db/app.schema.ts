import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { EmbedData, PostLabel } from '../types.d';
import { users } from "./auth.schema";

export const posts = sqliteTable('posts', {
  uuid: text('uuid', {mode: 'text'}).primaryKey(),
  content: text('content').notNull(),
  scheduledDate: integer('scheduled_date', { mode: 'timestamp_ms' }).notNull(),
  posted: integer('posted', { mode: 'boolean' }).default(false),
  // This is a flag to help beat any race conditions with our cron jobs
  postNow: integer('postNow', { mode: 'boolean' }).default(false),
  embedContent: text('embedContent', {mode: 'json'}).notNull().$type<EmbedData[]>().default(sql`(json_array())`),
  uri: text('uri'),
  cid: text('cid'),
  isRepost: integer('isRepost', { mode: 'boolean' }).default(false),
  contentLabel: text('contentLabel', {mode: 'text'}).$type<PostLabel>().default(PostLabel.None).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
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
  // for db pruning and parity with the PDS
  index("postedUUID_idx").on(table.uuid, table.posted),
  // cron job
  index("postNowScheduledDatePosted_idx")
    .on(table.posted, table.scheduledDate, table.postNow)
    .where(sql`posted = 0 and postNow <> 1`),
  // used to lower down the amount of posts that fill up the post table
  index("repostAddOn_idx").on(table.userId, table.cid)
]);

export const reposts = sqliteTable('reposts', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  uuid: text('post_uuid')
    .notNull()
    .references(() => posts.uuid, {onDelete: "cascade"}),
  scheduledDate: integer('scheduled_date', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [
  // cron queries
  index("repost_scheduledDate_idx").on(table.scheduledDate),
  // used for left joining and matching with posts field
  index("repost_postid_idx").on(table.uuid),
  unique("repost_noduplicates").on(table.uuid, table.scheduledDate),
]);

export const violations = sqliteTable('violations', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: text("user")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }).unique(),
  tosViolation: integer('tosViolation', { mode: 'boolean' }).default(false),
  userPassInvalid: integer('userPassInvalid', { mode: 'boolean' }).default(false),
  accountSuspended: integer('accountSuspended', { mode: 'boolean' }).default(false),
  accountGone: integer('accountGone', { mode: 'boolean' }).default(false),
  mediaTooBig: integer('mediaTooBig', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
}, (table) => [
  // joining and querying against the table's data
  index("violations_user_idx").on(table.userId)
]);

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
