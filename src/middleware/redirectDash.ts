import type { Context } from "hono";
import { every } from "hono/combine";
import { isSSGContext } from "hono/ssg";
import { pullAuthData } from "./auth";

async function goDashIfLogin(c: Context, next: any) {
  if (!isSSGContext(c)) {
    if (c.get("userId") !== null) {
      return c.redirect("/dashboard");
    }
  }
  await next();
}

export const redirectToDashIfLogin = every(pullAuthData, goDashIfLogin);