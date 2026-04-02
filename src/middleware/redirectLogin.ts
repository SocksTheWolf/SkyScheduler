import type { Context } from "hono";
import { every } from "hono/combine";
import { hasAuth, pullAuthData } from "./auth";

export async function goLoginIfLogout(c: Context, next: any) {
  if (!hasAuth(c)) {
    return c.redirect("/login");
  }
  await next();
}

export const redirectLoginIfLogout = every(pullAuthData, goLoginIfLogout);