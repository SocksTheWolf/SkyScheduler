import { Context } from "hono";
import { every } from "hono/combine";
import { authMiddleware } from "./auth";

// This requires that the user is an admin, it must pipe through
// the auth middleware first.
export async function adminOnlyMiddleware(c: Context, next: any) {
  if (c.get("isAdmin")) {
    await next();
    return;
  }
  return c.json({ error: "Unauthorized" }, 401);
}

export const authAdminOnlyMiddleware = every(authMiddleware, adminOnlyMiddleware);