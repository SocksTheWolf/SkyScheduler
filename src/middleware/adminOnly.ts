import { every } from "hono/combine";
import type { BaseContext, NextMiddleware } from "../types";
import { authMiddleware } from "./auth";

// This requires that the user is an admin, it must pipe through
// the auth middleware first.
async function adminOnlyMiddleware(c: BaseContext, next: NextMiddleware) {
  if (c.get("isAdmin")) {
    await next();
    return;
  }
  return c.json({ ok: false, msg: "Unauthorized" }, 401);
}

export const authAdminOnlyMiddleware = every(authMiddleware, adminOnlyMiddleware);