import { every } from "hono/combine";
import type { BaseContext } from "../types";
import { hasAuth, pullAuthData } from "./auth";

async function goLoginIfLogout(c: BaseContext, next: any) {
  if (!c.get("ssg")) {
    if (!hasAuth(c)) {
      return c.redirect("/login");
    }
  }
  await next();
}

export const redirectLoginIfLogout = every(pullAuthData, goLoginIfLogout);