import { cors } from "hono/cors";
import { ALLOW_CORS_ALL } from "../limits";
import type { BaseContext, NextMiddleware } from "../types";

export const corsHelperMiddleware = async (c: BaseContext, next: NextMiddleware) => {
  if (c.get("ssg")) {
    await next();
    return;
  }
  const middleware = cors({
    // if cors is allowing all, since we do require auth credentials, mirror
    // the requesting origin flag if it exists. The default is to not allow cors
    origin: (ALLOW_CORS_ALL ? (c.req.header("Origin") ?? "") : c.env.BETTER_AUTH_URL),
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
    credentials: true
  });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return middleware(c, next);
};
