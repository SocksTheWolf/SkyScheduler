import { Context } from "hono";
import humanId from "human-id";
import has from "just-has";

export const isUsingInviteKeys = (c: Context): boolean => {
  return has(c.env, "INVITE_POOL") && c.env.SIGNUP_SETTINGS.invite_only;
}

export const getInviteThread = (c: Context): string => {
  return c.env.SIGNUP_SETTINGS.invite_thread || "";
}

export const doesInviteKeyHaveValues = async (c: Context, inviteKey: string|undefined): Promise<boolean> => {
  if (isUsingInviteKeys(c)) {
    if (inviteKey === undefined)
      return false;

    const value = await c.env.INVITE_POOL!.get(inviteKey);
    // Key does not exist
    if (value === null)
      return false;

    // check the amount we have
    const amount: number = parseInt(value);

    // nans are failure
    if (isNaN(amount))
      return false;

    // -1 means infinite invites
    if (amount === -1 || amount >= 1)
      return true;
    else
      return false;
  }
  return true;
};

export const consumeInviteKey = async(c: Context, inviteKey: string|undefined) => {
  if (isUsingInviteKeys(c)) {
    if (inviteKey === undefined)
      return;

    const value = await c.env.INVITE_POOL!.get(inviteKey);
    if (value === null) {
      console.error(`attempted to use invite key ${inviteKey} but is invalid`);
      return;
    }
    // check the amount we have
    const amount: number = parseInt(value);

    // handle NaN
    if (isNaN(amount)) {
      console.warn(`${inviteKey} has the value of ${value} which triggers NaN.`);
      return;
    }

    // -1 has infinite invites
    if (amount === -1)
      return;

    let newValue: number = amount - 1;
    // Delete any keys that fall to 0, they should be removed from the db
    if (newValue <= 0) {
      await c.env.INVITE_POOL!.delete(inviteKey);
      return;
    }

    // put the new value on the stack
    await c.env.INVITE_POOL!.put(inviteKey, newValue.toString());
  }
}

export const makeInviteKey = (c: Context): string|null => {
  if (!isUsingInviteKeys(c)) {
    return null;
  }

  const newKey: string = humanId({
    separator: '-',
    capitalize: false,
  });
  c.executionCtx.waitUntil(c.env.INVITE_POOL!.put(newKey, "10"));
  return newKey;
}