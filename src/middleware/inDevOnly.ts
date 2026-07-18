import type { Context } from "hono";
import { every } from "hono/combine";
import { disableSSG } from "hono/ssg";

export async function devOnlyMiddleware(c: Context, next: any) {
  if (c.env.IN_DEV === false) {
    return c.notFound();
  }
  await next();
}

export const onlyInDevelopment = every(disableSSG(), devOnlyMiddleware);
