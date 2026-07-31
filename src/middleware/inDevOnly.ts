import type { Context } from "hono";
import { isInDev } from "../utils/helpers";

export async function onlyInDevelopment(c: Context, next: any) {
  if (!isInDev(c.env)) {
    return c.notFound();
  }
  await next();
};
