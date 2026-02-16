import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { users } from "./auth.schema";

// violations of current users of this service
export const violations = sqliteTable('violations', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: text("user")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }).unique(),
  // violated skyscheduler TOS
  tosViolation: integer('tosViolation', { mode: 'boolean' }).default(false),
  // user has an invalid username/app password from BSKY (self heals upon change)
  userPassInvalid: integer('userPassInvalid', { mode: 'boolean' }).default(false),
  // user is currently suspended from BSKY,
  // tells the scheduler to skip their posts at this time (partially self heals)
  accountSuspended: integer('accountSuspended', { mode: 'boolean' }).default(false),
  // account is no longer available on BSKY, usually when the account is deleted from BSKY
  accountGone: integer('accountGone', { mode: 'boolean' }).default(false),
  // rare, when BSKY tells us that the media is not allowed to be posted.
  // mostly for older posts, as new code handles these states better
  // (self heals upon post deletion)
  mediaTooBig: integer('mediaTooBig', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
}, (table) => [
  // joining and querying against the table's data
  index("violations_user_idx").on(table.userId)
]);

// banned users from skyscheduler, prevents them from signing up
export const bannedUsers = sqliteTable('bans', {
  did: text('account_did').primaryKey().notNull(),
  reason: text('banReason').notNull().default(""),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
  .default(sql`CURRENT_TIMESTAMP`)
  .notNull(),
});
