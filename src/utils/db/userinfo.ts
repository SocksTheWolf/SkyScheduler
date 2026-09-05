import { eq } from "drizzle-orm";
import isEmpty from "just-is-empty";
import { BskyAPILoginCreds } from "../../classes/bskyLogin";
import { users } from "../../db/auth.schema";
import type { AllContext, DBProcessor, DBServiceLogin, UserIdType } from "../../types";

export const doesUserExist = async (c: AllContext, username: string): Promise<boolean> => {
  const db: DBProcessor = c.get("db");
  if (!db) {
    return false;
  }
  const result = await db.select().from(users)
    .where(eq(users.username, username))
    .limit(1).all();
  return result.length > 0;
};

export const doesAdminExist = async (c: AllContext) => {
  const db: DBProcessor = c.get("db");
  if (!db) {
    return false;
  }

  const result = await db.select().from(users)
    .where(eq(users.name, "admin"))
    .limit(1).all();
  return result.length > 0;
};

export const getBskyUserPassForId = async (c: AllContext, userid: UserIdType): Promise<BskyAPILoginCreds> => {
  const db: DBProcessor = c.get("db");
  if (!db || !userid)
    return new BskyAPILoginCreds(null);

  const response: DBServiceLogin[] = await db.select({user: users.username, pass: users.bskyAppPass, pds: users.pds, did: users.did})
    .from(users)
    .where(eq(users.id, userid))
    .limit(1).all();
  return new BskyAPILoginCreds(response[0] ?? null);
};

export const getUsernameForUserId = async (c: AllContext, userId: UserIdType): Promise<string|null> => {
  const db: DBProcessor = c.get("db");
  if (!db || !userId)
    return null;

  const result = await db.select({username: users.username}).from(users)
    .where(eq(users.id, userId)).limit(1);
  if (result.length > 0)
    return result[0].username;
  return null;
};

export const getUsernameForUser = async (c: AllContext): Promise<string|null> => {
  const userId: UserIdType = c.get("userId");
  if (!userId)
    return null;

  return await getUsernameForUserId(c, userId);
};

// This is a super dumb query that's needed to get around better auth's forgot password system
// because you cannot make the call with just an username, you need to also have the email
// but we never update the email past the original time you first signed up, so instead
// we use big brain tactics to spoof the email
export const getUserEmailForHandle = async (c: AllContext, userhandle: string): Promise<string|null> => {
  const db: DBProcessor = c.get("db");
  if (!db)
    return null;

  const result = await db.select({email: users.email}).from(users).where(eq(users.username, userhandle)).limit(1);
  if (!isEmpty(result))
    return result[0].email;
  return null;
};