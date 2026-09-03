import { drizzle } from "drizzle-orm/d1";
import { ExtendedD1Database } from "../../classes/db";
import { schema } from "../../db/schema";

export function getDrizzle(DB: D1Database) {
  // This is currently separated in a helper function
  // so that if we get D1 read replicas, we can easily invoke them.
  return drizzle(new ExtendedD1Database(DB), { schema, logger: false });
}
