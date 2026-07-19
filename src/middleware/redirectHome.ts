import type { Context } from "hono";
import { every } from "hono/combine";
import { isSSGContext } from "hono/ssg";
import { hasAuth, pullAuthData } from "./auth";

async function goHomeIfLogout(c: Context, next: any) {
  if (!isSSGContext(c)) {
    if (!hasAuth(c)) {
      return c.redirect("/");
    }
  }
  await next();
}

export const redirectHomeIfLogout = every(pullAuthData, goHomeIfLogout);