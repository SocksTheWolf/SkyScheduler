import { Context } from "hono";

// Middleware to verify authentication
export async function authMiddleware(c: Context, next: any) {
  const auth = c.get("auth");
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers
    });
    if (session?.session && session?.user) {
      c.set("user", session.user);
      c.set("session", session.session);
      await next();
      return;
    }
  }
  catch (err) {
    console.error(`Failed to process authentication, got err: ${err}`);
  }
  c.set("user", null);
  c.set("session", null);
  return c.json({ error: "Unauthorized" }, 401);
}