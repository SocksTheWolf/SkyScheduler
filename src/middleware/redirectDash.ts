import { every } from "hono/combine";
import type { BaseContext, NextMiddleware } from "../types";
import { pullAuthData } from "./auth";

async function goDashIfLogin(c: BaseContext, next: NextMiddleware) {
  if (!c.get("ssg")) {
    if (c.get("userId") !== null) {
      return c.redirect("/dashboard");
    }
  }
  await next();
}

export const redirectToDashIfLogin = every(pullAuthData, goDashIfLogin);
