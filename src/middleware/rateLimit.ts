import { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { html } from "hono/html";
import isEmpty from "just-is-empty";
import get from 'just-safe-get';

type RateLimitProps = {
  limiter: string;
  html?: boolean;
  toast?: boolean;
  message?: string;
};

export const rateLimit = (prop: RateLimitProps) => {
  return createMiddleware(async (c: Context, next: any) => {
    const rateLimitObj: RateLimit|null = get(c.env, prop.limiter, null);
    if (rateLimitObj === null) {
      await next();
      return;
    }

    // by default use the userId key, but this may be blank...
    let rateLimitKey: string|null = c.get("userId");

    // if there's no rate limit key (because no auth, pull down the connecting ip address)
    if (rateLimitKey === null) {
      rateLimitKey = c.req.header("cf-connecting-ip") || "";
    }

    const { success } = await rateLimitObj.limit({ key: rateLimitKey! });
    if (success) {
      // not rate limited, continue.
      await next();
    } else {
      // rate limited.
      const str: string = prop.message || "You are currently rate limited, try again later";
      if (prop.html) {
        if (prop.toast) {
          c.header("HX-Trigger-After-Settle", `{"rateLimitNotice": "${str}"}`);
        }
        return c.html(html`<b class="btn-error">${str}</b>`);
      } else {
        return c.json({ok: false, msg: str, rate_limited: true}, 429);
      }
    }
  });
};