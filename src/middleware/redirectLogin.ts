import type { Context } from "hono";
import { every } from "hono/combine";
import { isSSGContext } from "hono/ssg";
import { hasAuth, pullAuthData } from "./auth";

async function goLoginIfLogout(c: Context, next: any) {
  if (!isSSGContext(c)) {
    if (!hasAuth(c)) {
      return c.redirect("/login");
    }
  }
  await next();
}

export const redirectLoginIfLogout = every(pullAuthData, goLoginIfLogout);