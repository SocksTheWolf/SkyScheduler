import { sql } from "drizzle-orm";
import { users } from "./auth.schema";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { EmbedData, PostLabel } from '../types.d';

export const posts = sqliteTable('posts', {
  uuid: text('uuid', {mode: 'text'}).primaryKey(),
  content: text('content').notNull(),
  scheduledDate: integer('scheduled_date', { mode: 'timestamp_ms' }).notNull(),
  posted: integer('posted', { mode: 'boolean' }).default(false),
  embedContent: text('embedContent', {mode: 'json'}).notNull().$type<EmbedData[]>().default(sql`(json_array())`),
  uri: text('uri'),
  cid: text('cid'),
  contentLabel: text('contentLabel', {mode: 'text'}).$type<PostLabel>().default(PostLabel.None).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  userId: text("user")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
}, (table) => [
  index("scheduledDate_idx").on(table.scheduledDate),
  index("user_idx").on(table.userId)
]);

export const reposts = sqliteTable('reposts', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  uuid: text('post_uuid')
    .notNull()
    .references(() => posts.uuid, {onDelete: "cascade"}),
  scheduledDate: integer('scheduled_date', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [
  index("repost_scheduledDate_idx").on(table.scheduledDate),
]);
