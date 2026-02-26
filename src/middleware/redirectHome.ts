import { Context } from "hono";
import { every } from "hono/combine";
import { hasAuth, pullAuthData } from "./auth";

export async function goHomeIfLogout(c: Context, next: any) {
  if (!hasAuth(c)) {
    return c.redirect("/");
  }
  await next();
}

export const redirectHomeIfLogout = every(pullAuthData, goHomeIfLogout);