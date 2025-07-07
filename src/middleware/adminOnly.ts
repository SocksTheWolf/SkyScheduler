import { Context } from "hono";

// This requires that the user is an admin, it must pipe through
// the auth middleware first.
export async function adminOnlyMiddleware(c: Context, next: any) {
  const user = c.get("user");
  console.log(user);

  if (user.username === c.env.DEFAULT_ADMIN_USER) {
    await next();
    return;
  }
  return c.json({ error: "Unauthorized" }, 401);
}
