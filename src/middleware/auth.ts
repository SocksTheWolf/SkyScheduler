import { Context } from "hono";
import { every } from "hono/combine";

// Middleware to verify authentication
export async function pullAuthData(c: Context, next: any) {
  const auth = c.get("auth");
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers
    });
    if (session?.session && session?.user) {
      c.set("user", session.user);
      c.set("session", session.session);
    } else {
      c.set("user", null);
      c.set("session", null);
    }
  }
  catch (err) {
    console.error(`Failed to process authentication, got err: ${err}`);
    c.set("user", null);
    c.set("session", null);
  }
  await next();
}
export async function requireAuth(c: Context, next: any) { 
  if (c.get("session") === null || c.get("user") === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
}

export const authMiddleware = every(pullAuthData, requireAuth);