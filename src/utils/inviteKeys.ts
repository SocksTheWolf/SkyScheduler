import { Context } from "hono";
import has from "just-has";

export const isUsingInviteKeys = (c: Context) => {
  return has(c.env, "INVITE_POOL") && c.env.USE_INVITE_KEYS;
}

export const doesInviteKeyHaveValues = async (c: Context, inviteKey: string|undefined) => {
  if (isUsingInviteKeys(c)) {
    if (inviteKey === undefined)
      return false;

    const value = await c.env.INVITE_POOL.get(inviteKey.toLowerCase());
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

export const useInviteKey = async(c: Context, inviteKey: string|undefined) => {
  if (isUsingInviteKeys(c)) {
    if (inviteKey === undefined)
      return;

    const loweredKey = inviteKey.toLowerCase();
    const value = await c.env.INVITE_POOL.get(loweredKey);
    if (value === null) {
      console.error(`attempted to use invite key ${inviteKey} but is invalid`);
      return;
    }
    // check the amount we have
    const amount: number = parseInt(value);
    
    // handle NaN
    if (isNaN(amount)) {
      console.warn(`${loweredKey} has the value of ${value} which triggers NaN.`);
      return;
    }

    // -1 has infinite invites
    if (amount === -1)
      return;

    let newValue: number = amount - 1;
    // Delete any keys that fall to 0, they should be removed from the db
    if (newValue <= 0) {
      await c.env.INVITE_POOL.delete(loweredKey);
      return;
    }

    // put the new value on the stack
    await c.env.INVITE_POOL.put(loweredKey, newValue.toString());
  }
}