import { every } from "hono/combine";
import type { BaseContext } from "../types";
import { hasAuth, pullAuthData } from "./auth";

async function goHomeIfLogout(c: BaseContext, next: any) {
  if (!c.get("ssg")) {
    if (!hasAuth(c)) {
      return c.redirect("/");
    }
  }
  await next();
}

export const redirectHomeIfLogout = every(pullAuthData, goHomeIfLogout);