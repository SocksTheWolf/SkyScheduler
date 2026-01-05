import { Context } from "hono";
import { cors } from "hono/cors";

export const corsHelperMiddleware = async (c: Context, next:any) => {
  const middleware = cors({
      origin: c.env.BETTER_AUTH_URL,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["POST", "GET", "OPTIONS", "DELETE"],
      exposeHeaders: ["Content-Length", "Content-Type", "HX-Trigger", "HX-Redirect", "HX-Trigger-After-Swap", "HX-Trigger-After-Settle"],
      maxAge: 600,
      credentials: true,
  });
  return middleware(c, next);
};