import type { Context } from "hono";
import { every } from "hono/combine";
import { disableSSG } from "hono/ssg";
import { isInDev } from "../utils/helpers";

async function devOnlyMiddleware(c: Context, next: any) {
  if (!isInDev(c.env)) {
    return c.notFound();
  }
  await next();
}

export const onlyInDevelopment = every(disableSSG(), devOnlyMiddleware);
