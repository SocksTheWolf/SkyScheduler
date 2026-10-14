import { every } from "hono/combine";
import type { BaseContext, NextMiddleware } from "../types";
import { hasAuth, pullAuthData } from "./auth";
import { sessionMiddleware } from "./session";

async function goLoginIfLogout(c: BaseContext, next: NextMiddleware) {
  if (!c.get("ssg")) {
    if (!hasAuth(c)) {
      return c.redirect("/login");
    }
  }
  await next();
}

export const redirectLoginIfLogout = every(sessionMiddleware, pullAuthData, goLoginIfLogout);
