import { Context } from "hono";

// This requires that the user is an admin, it must pipe through
// the auth middleware first.
export async function adminOnlyMiddleware(c: Context, next: any) {
  if (c.get("isAdmin")) {
    await next();
    return;
  }
  return c.json({ error: "Unauthorized" }, 401);
}
