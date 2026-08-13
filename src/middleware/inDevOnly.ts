import type { BaseContext, NextMiddleware } from "../types";
import { isInDev } from "../utils/helpers";

export async function onlyInDevelopment(c: BaseContext, next: NextMiddleware) {
  if (!isInDev(c.env)) {
    return c.notFound();
  }
  await next();
}
