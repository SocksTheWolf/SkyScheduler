import { Context } from "hono";
import { createMiddleware } from "hono/factory";
import isEmpty from "just-is-empty";
import get from 'just-safe-get';

type RateLimitProps = {
  limiter: string;
};

export const rateLimit = async (prop: RateLimitProps) => {
  return createMiddleware(async (c: Context, next: any) => {
    const userId: string = c.get("userId");
    const rateLimitObj: RateLimit|null = get(c.env, prop.limiter, null);
    if (rateLimitObj === null || isEmpty(userId)) {
      await next();
      return;
    }
    const { success } = await rateLimitObj.limit({ key: userId });
    if (success) {
      await next();
    } else {
      return c.json({ok: false, msg: "you are currently rate limited, try again in a minute"});
    }
  });
};