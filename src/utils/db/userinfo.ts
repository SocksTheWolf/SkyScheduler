import { eq } from "drizzle-orm";
import isEmpty from "just-is-empty";
import { BskyAPILoginCreds } from "../../classes/bskyLogin";
import { users } from "../../db/auth.schema";
import type { AllContext, DBProcessor, DBServiceData, DBServiceLogin, UserIdType } from "../../types";

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

export const getBskyCredentialsForId = async (c: AllContext, userid: UserIdType): Promise<BskyAPILoginCreds> => {
  const db: DBProcessor = c.get("db");
  if (!db || !userid)
    return new BskyAPILoginCreds(null);

  const response: DBServiceLogin[] = await db.select({user: users.username, pass: users.bskyAppPass, pds: users.pds, did: users.did})
    .from(users)
    .where(eq(users.id, userid))
    .limit(1).all();
  return new BskyAPILoginCreds(response[0] ?? null);
};

export const getBskyUserDataForHandle = async (c: AllContext, handle: string): Promise<DBServiceData|null> => {
  const db: DBProcessor = c.get("db");
  if (!db || isEmpty(handle))
    return null;

  const response: DBServiceData[] = await db.select({user: users.username, pds: users.pds, did: users.did, email: users.email})
    .from(users)
    .where(eq(users.username, handle))
    .limit(1);
  if (response.length > 0)
    return response[0];

  return null;
}

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

  return getUsernameForUserId(c, userId);
};
