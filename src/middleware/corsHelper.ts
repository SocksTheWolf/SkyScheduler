import { cors } from "hono/cors";
import type { BaseContext, NextMiddleware } from "../types";

export const corsHelperMiddleware = async (c: BaseContext, next: NextMiddleware) => {
  if (c.get("ssg")) {
    await next();
    return;
  }
  const middleware = cors({
    origin: c.env.BETTER_AUTH_URL,
    allowHeaders: ["Content-Type", "Authorization", "X-CSRF-TOKEN"],
    allowMethods: ["POST", "GET", "OPTIONS", "DELETE"],
    exposeHeaders: [
      "Content-Length",
      "Content-Type",
      "HX-Trigger",
      "HX-Push-Url",
      "HX-Replace-Url",
      "HX-Refresh",
      "Cache-Control",
      "HX-Redirect",
      "HX-Trigger-After-Swap",
      "HX-Trigger-After-Settle",
      "X-Retry-After",
      "Age",
      "Clear-Site-Data",
      "Location",
    ],
    maxAge: 7200,
  });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return middleware(c, next);
};
