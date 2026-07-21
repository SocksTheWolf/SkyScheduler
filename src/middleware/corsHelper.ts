import type { Context } from "hono";
import { cors } from "hono/cors";
import { isSSGContext } from "hono/ssg";

export const corsHelperMiddleware = async (c: Context, next: any) => {
  if (isSSGContext(c)) {
    await next();
    return;
  }
  const middleware = cors({
    origin: c.env.BETTER_AUTH_URL,
    allowHeaders: ["Content-Type", "Authorization", "X-CSRF-TOKEN"],
    allowMethods: ["POST", "GET", "OPTIONS", "DELETE"],
    exposeHeaders: ["Content-Length", "Content-Type", "HX-Trigger",
      "HX-Push-Url", "HX-Replace-Url", "HX-Refresh", "Cache-Control",
      "HX-Redirect", "HX-Trigger-After-Swap", "HX-Trigger-After-Settle",
      "X-Retry-After", "Age", "Clear-Site-Data"],
    maxAge: 7200,
  });
  return middleware(c, next);
};