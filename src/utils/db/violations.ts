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

export const userHasViolations = async (db: DrizzleD1Database, userId: string): Promise<boolean> => {
  const response = await getViolationsForUser(db, userId);
  return response.results.length > 0;
};

function createObjForValuesChange (violationType: PlatformLoginResponse[], value: boolean) {
  let valuesUpdate:LooseObj = {};
  if (PlatformLoginResponse.InvalidAccount in violationType)
    valuesUpdate.userPassInvalid = value;

  if (PlatformLoginResponse.Suspended in violationType)
    valuesUpdate.accountSuspended = value;

  if (PlatformLoginResponse.MediaTooBig in violationType)
    valuesUpdate.mediaTooBig = value;

  if (PlatformLoginResponse.TOSViolation in violationType)
    valuesUpdate.tosViolation = value;

  if (PlatformLoginResponse.TakenDown in violationType || PlatformLoginResponse.Deactivated in violationType)
    valuesUpdate.accountGone = value;

  return valuesUpdate;
}

export const createViolationForUser = async(env: Bindings, userId: string, violationType: PlatformLoginResponse): Promise<boolean> => {
  const NoHandleState: PlatformLoginResponse[] = [PlatformLoginResponse.Ok, PlatformLoginResponse.PlatformOutage, 
    PlatformLoginResponse.None, PlatformLoginResponse.UnhandledError];
  // Don't do anything in these cases
  if (violationType in NoHandleState) {
    console.warn(`createViolationForUser got a not valid add request for user ${userId} with violation ${violationType}`);
    return false;
  }

  const db: DrizzleD1Database = drizzle(env.DB);
  const valuesUpdate:LooseObj = createObjForValuesChange([violationType], true);
  if (violationType === PlatformLoginResponse.TOSViolation) {
    const bskyUsername = await getUsernameForUserId(env, userId);
    if (bskyUsername !== null) {
      await createBanForUser(env, bskyUsername, "tos violation");
    } else {
      console.warn(`unable to get bsky username for id ${userId}`);
    }
  }

  const {success} = await db.insert(violations).values({userId: userId, ...valuesUpdate})
    .onConflictDoUpdate({target: violations.userId, set: valuesUpdate});
  return success;
};

export const getViolationDeleteQueryForUser = (db: DrizzleD1Database, userId: string) => {
  return db.delete(violations).where(and(eq(violations.userId, userId), 
    and(ne(violations.tosViolation, true), ne(violations.accountGone, true))
  ));
};

export const removeViolation = async(env: Bindings, userId: string, violationType: PlatformLoginResponse) => {
  await removeViolations(env, userId, [violationType]);
};

export const removeViolations = async(env: Bindings, userId: string, violationType: PlatformLoginResponse[]) => {
  const db: DrizzleD1Database = drizzle(env.DB);
  // Check if they have a violation first
  if ((await userHasViolations(db, userId)) == false) {
    return;
  }

  // Create the update query
  const valuesUpdate:LooseObj = createObjForValuesChange(violationType, false);
  await db.update(violations).set({...valuesUpdate}).where(eq(violations.userId, userId));
  // Delete the record if the user has no other violations
  await db.delete(violations).where(and(eq(violations.userId, userId), 
    and(
      and(
        and(ne(violations.accountSuspended, true), ne(violations.accountGone, true),
        and(ne(violations.userPassInvalid, true), ne(violations.mediaTooBig, true))
        ),
      ne(violations.tosViolation, true))
    )));
}

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