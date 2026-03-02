import { and, eq, lte, ne, sql } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import flatten from "just-flatten-it";
import isEmpty from "just-is-empty";
import { bannedUsers, violations } from "../../db/enforcement.schema";
import { AccountStatus, AllContext, LooseObj, Violation } from "../../types";
import { lookupBskyHandle } from "../bskyApi";
import { getUsernameForUserId } from "./userinfo";

const createBanForUser = async(db: DrizzleD1Database, userName: string, reason: string) => {
  if (userName !== null) {
    const didHandle = await lookupBskyHandle(userName);
    if (didHandle !== null) {
      await db.insert(bannedUsers).values({did: didHandle, reason: reason}).onConflictDoNothing();
      console.log(`ban inserted for user ${userName}`);
    } else {
      console.warn(`unable to get did handle for banned user ${userName}`);
    }
  }
};

export const userHasBan = async(c: AllContext, userDid: string): Promise<boolean> => {
  const db: DrizzleD1Database = c.get("db");
  if (!db) {
    console.error("unable to check if user has ban, db was null");
    return false;
  }
  const usersBanned = await db.$count(bannedUsers, eq(bannedUsers.did, userDid));
  return (usersBanned > 0);
};

export const userHandleHasBan = async(c: AllContext, userName: string) => {
  if (userName !== null) {
    const didHandle = await lookupBskyHandle(userName);
    if (didHandle !== null)
      return await userHasBan(c, didHandle);
  }
  return false;
};

export const userHasViolationsDB = async(db: DrizzleD1Database, userId: string): Promise<boolean> => {
  return (await getViolationsForUser(db, userId)) != null;
};

export const userHasViolations = async(c: AllContext, userId: string): Promise<boolean> => {
  return await userHasViolationsDB(c.get("db"), userId);
};

function createObjForValuesChange(violationType: AccountStatus[], value: boolean) {
  let valuesUpdate: LooseObj = {};
  violationType.forEach((itm) => {
    switch(itm) {
      case AccountStatus.InvalidAccount:
        valuesUpdate.userPassInvalid = value;
      break;
      case AccountStatus.Suspended:
        valuesUpdate.accountSuspended = value;
      break;
      case AccountStatus.MediaTooBig:
        valuesUpdate.mediaTooBig = value;
      break;
      case AccountStatus.TOSViolation:
        valuesUpdate.tosViolation = value;
      break;
      case AccountStatus.TakenDown:
      case AccountStatus.Deactivated:
        valuesUpdate.accountGone = value;
      break;
    }
  });
  return valuesUpdate;
};

export const createViolationForUser = async(c: AllContext, userId: string, violationType: AccountStatus): Promise<boolean> => {
  const NoHandleState: AccountStatus[] = [AccountStatus.Ok, AccountStatus.PlatformOutage,
    AccountStatus.None, AccountStatus.UnhandledError];
  // Don't do anything in these cases
  if (violationType in NoHandleState) {
    console.warn(`createViolationForUser got a not valid add request for user ${userId} with violation ${violationType}`);
    return false;
  }

  const db: DrizzleD1Database = c.get("db");
  if (!db) {
    console.error("unable to get database to create violations for");
    return false;
  }

  let violationsArray = [];
  violationsArray.push(violationType);
  violationsArray = flatten(violationsArray);
  const valuesUpdate: LooseObj = createObjForValuesChange(violationsArray, true);

  // handle auto-bans
  if (violationType === AccountStatus.TOSViolation) {
    const bskyUsername = await getUsernameForUserId(c, userId);
    if (bskyUsername !== null) {
      await createBanForUser(db, bskyUsername, "tos violation");
    } else {
      console.warn(`unable to get bsky username for id ${userId}`);
    }
  }

  // if there are no violations, then give none.
  if (isEmpty(valuesUpdate)) {
    //console.log("no value change");
    return false;
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

export const removeViolation = async(c: AllContext, userId: string, violationType: AccountStatus) => {
  await removeViolations(c, userId, [violationType]);
};

export const removeViolations = async(c: AllContext, userId: string, violationType: AccountStatus[]) => {
  const db: DrizzleD1Database = c.get("db");
  if (!db) {
    console.warn(`unable to remove violations for user ${userId}, db was null`);
    return;
  }
  // Check if they have a violation first
  if ((await userHasViolationsDB(db, userId)) == false) {
    return;
  }

  // Create the update query
  const valuesUpdate: LooseObj = createObjForValuesChange(violationType, false);
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
};

export const getViolationsForUser = async(db: DrizzleD1Database, userId: string) => {
  const {results} = await db.select().from(violations)
    .where(eq(violations.userId, userId)).limit(1).run();
  if (results.length > 0)
    return (results[0] as Violation);
  return null;
};

export const getViolationsForCurrentUser = async(c: AllContext): Promise<Violation|null> => {
  const userId = c.get("userId");
  const db: DrizzleD1Database = c.get("db");
  if (userId && db) {
    return await getViolationsForUser(db, userId);
  }
  return null;
};

export const getAllViolationsAfterTime = async(c: AllContext): Promise<string[]|null> => {
  const db: DrizzleD1Database = c.get("db");
  if (db) {
    const results = await db.select({id: violations.userId}).from(violations).where(
      lte(violations.createdAt, sql`datetime('now', '-12 weeks')`)).all();
    return results.map((it) => it.id);
  }
  return null;
};