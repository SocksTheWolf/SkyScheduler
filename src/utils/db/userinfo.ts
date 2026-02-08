import { eq } from "drizzle-orm";
import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import { Context } from "hono";
import isEmpty from "just-is-empty";
import { validate as uuidValid } from 'uuid';
import { users } from "../../db/auth.schema";
import { Bindings, BskyAPILoginCreds } from "../../types.d";
import { createLoginCredsObj } from "../helpers";

export const doesUserExist = async (c: Context, username: string) => {
  const db: DrizzleD1Database = drizzle(c.env.DB);
  const result = await db.select().from(users)
    .where(eq(users.username, username))
    .limit(1).all();
  return result.length > 0;
};

export const doesAdminExist = async (c: Context) => {
  const db: DrizzleD1Database = drizzle(c.env.DB);
  const result = await db.select().from(users)
    .where(eq(users.name, "admin"))
    .limit(1).all();
  return result.length > 0;
};

export const getBskyUserPassForId = async (env: Bindings, userid: string): Promise<BskyAPILoginCreds> => {
  const db: DrizzleD1Database = drizzle(env.DB);
  const response = await db.select({user: users.username, pass: users.bskyAppPass, pds: users.pds})
    .from(users)
    .where(eq(users.id, userid))
    .limit(1).all();
  return createLoginCredsObj(response[0] || null);
};

export const getUsernameForUserId = async (env: Bindings, userId: string): Promise<string|null> => {
  if (!uuidValid(userId))
    return null;

  const db: DrizzleD1Database = drizzle(env.DB);
  const result = await db.select({username: users.username}).from(users)
    .where(eq(users.id, userId)).limit(1);
  if (result !== null && result.length > 0)
    return result[0].username;
  return null;
};

export const getUsernameForUser = async (c: Context): Promise<string|null> => {
  const userId = c.get("userId");
  if (!userId)
    return null;

  return await getUsernameForUserId(c.env, userId);
};

// This is a super dumb query that's needed to get around better auth's forgot password system
// because you cannot make the call with just an username, you need to also have the email
// but we never update the email past the original time you first signed up, so instead
// we use big brain tactics to spoof the email
export const getUserEmailForHandle = async (env: Bindings, userhandle: string): Promise<string|null> => {
  const db: DrizzleD1Database = drizzle(env.DB);
  const result = await db.select({email: users.email}).from(users).where(eq(users.username, userhandle)).limit(1);
  if (!isEmpty(result))
    return result[0].email;
  return null;
};