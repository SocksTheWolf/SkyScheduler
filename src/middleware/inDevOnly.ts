import type { Context } from "hono";

export async function onlyInDevelopment(c: Context, next: any) {
  if (c.env.IN_DEV === false) {
    return c.json({}, 401);
  }
  await next();
}
