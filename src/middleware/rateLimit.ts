import { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { html } from "hono/html";
import isEmpty from "just-is-empty";
import get from 'just-safe-get';

type RateLimitProps = {
  limiter: string;
  html?: boolean;
  message?: string;
};

export const rateLimit = (prop: RateLimitProps) => {
  return createMiddleware(async (c: Context, next: any) => {
    const userId: string = c.get("userId");
    const rateLimitObj: RateLimit|null = get(c.env, prop.limiter, null);
    if (rateLimitObj === null || isEmpty(userId)) {
      console.warn("cannot apply rate limits, oh no");
      await next();
      return;
    }
    const { success } = await rateLimitObj.limit({ key: userId });
    if (success) {
      await next();
    } else {
      const str: string = prop.message || "You are currently rate limited, try again later";
      if (prop.html) {
        return c.html(html`<b class="btn-error">${str}</b>`);
      } else {
        return c.json({ok: false, msg: str}, 429);
      }
    }
  });
};