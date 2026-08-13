import { every } from "hono/combine";
import type { BaseContext, NextMiddleware } from "../types";
import { hasAuth, pullAuthData } from "./auth";

async function goLoginIfLogout(c: BaseContext, next: NextMiddleware) {
  if (!c.get("ssg")) {
    if (!hasAuth(c)) {
      return c.redirect("/login");
    }
  }
  await next();
}

export const redirectLoginIfLogout = every(pullAuthData, goLoginIfLogout);
