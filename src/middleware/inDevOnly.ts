import type { BaseContext } from "../types";
import { isInDev } from "../utils/helpers";

export async function onlyInDevelopment(c: BaseContext, next: any) {
  if (!isInDev(c.env)) {
    return c.notFound();
  }
  await next();
};
