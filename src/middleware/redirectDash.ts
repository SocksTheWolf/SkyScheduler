import { every } from "hono/combine";
import type { BaseContext } from "../types";
import { pullAuthData } from "./auth";

async function goDashIfLogin(c: BaseContext, next: any) {
  if (!c.get("ssg")) {
    if (c.get("userId") !== null) {
      return c.redirect("/dashboard");
    }
  }
  await next();
}

export const redirectToDashIfLogin = every(pullAuthData, goDashIfLogin);