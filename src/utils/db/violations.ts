import { and, eq, ne } from "drizzle-orm";
import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import { Context } from "hono";
import { bannedUsers, violations } from "../../db/app.schema";
import { Bindings, LooseObj, PlatformLoginResponse } from "../../types.d";
import { lookupBskyHandle } from "../bskyApi";
import { getUsernameForUserId } from "./userinfo";

const createBanForUser = async (env: Bindings, userName: string, reason: string) => {
  if (userName !== null) {
    const didHandle = await lookupBskyHandle(userName);
    if (didHandle !== null) {
      const db: DrizzleD1Database = drizzle(env.DB);
      await db.insert(bannedUsers).values({did: didHandle, reason: reason}).onConflictDoNothing();
      console.log(`ban inserted for user ${userName}`);
    } else {
      console.warn(`unable to get did handle for banned user ${userName}`);
    }
  }
}

export const userHasBan = async (env: Bindings, userDid: string): Promise<boolean> => {
  const db: DrizzleD1Database = drizzle(env.DB);
  return (await db.select().from(bannedUsers).where(eq(bannedUsers.did, userDid)).limit(1).all()).length > 0;
};

export const userHandleHasBan = async (env: Bindings, userName: string) => {
  if (userName !== null) {
    const didHandle = await lookupBskyHandle(userName);
    if (didHandle !== null)
      return await userHasBan(env, didHandle);
  }
  return false;
};

export const createViolationForUser = async(env: Bindings, userId: string, violationType: PlatformLoginResponse): Promise<boolean> => {
  const NoHandleState: PlatformLoginResponse[] = [PlatformLoginResponse.Ok, PlatformLoginResponse.PlatformOutage, 
    PlatformLoginResponse.None, PlatformLoginResponse.UnhandledError];
  // Don't do anything in these cases
  if (violationType in NoHandleState) {
    console.warn(`createViolationForUser got a not valid add request for user ${userId} with violation ${violationType}`);
    return false;
  }

  const db: DrizzleD1Database = drizzle(env.DB);
  let valuesUpdate:LooseObj = {};
  switch (violationType) {
    case PlatformLoginResponse.InvalidAccount:
      valuesUpdate.userPassInvalid = true;
    break;
    case PlatformLoginResponse.Suspended:
      valuesUpdate.accountSuspended = true;
    break;
    case PlatformLoginResponse.TakenDown:
    case PlatformLoginResponse.Deactivated:
      valuesUpdate.accountGone = true;
    break;
    case PlatformLoginResponse.MediaTooBig:
      valuesUpdate.mediaTooBig = true;
    break;
    case PlatformLoginResponse.TOSViolation:
      valuesUpdate.tosViolation = true;      
      const bskyUsername = await getUsernameForUserId(env, userId);
      if (bskyUsername !== null) {
        await createBanForUser(env, bskyUsername, "tos violation");
      } else {
        console.warn(`unable to get bsky username for id ${userId}`);
      }
    break;
    default:
      console.warn(`createViolationForUser was not properly handled for ${violationType}`);
      return false;
  }

  const {success} = await db.insert(violations).values({userId: userId, ...valuesUpdate})
    .onConflictDoUpdate({target: violations.userId, set: valuesUpdate});
  return success;
};

export const getViolationDeleteQueryForUser = (db: DrizzleD1Database, userId: string) => {
  return db.delete(violations).where(and(eq(violations.userId, userId), 
    and(ne(violations.tosViolation, true), ne(violations.accountGone, true))));
};

export const clearViolationForUser = async(env: Bindings, userId: string) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  const {success} = await getViolationDeleteQueryForUser(db, userId);
  return success;
};

export const getViolationsForUser = async(db: DrizzleD1Database, userId: string) => {
  return await db.select().from(violations).where(eq(violations.userId, userId)).limit(1).run();
};

export const getViolationsForCurrentUser = async(c: Context) => {
  const userId = c.get("userId");
  if (userId) {
    const db: DrizzleD1Database = drizzle(c.env.DB);
    return await getViolationsForUser(db, userId);
  } else {
    return {success: false, results: []};
  }
};