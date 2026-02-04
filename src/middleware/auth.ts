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
      c.set("userId", session.user.id);
      c.set("pds", session.user.pds);
      // This can't be changed by anyone specifically because it's not a domain
      // and zod will require your username to be a domain.
      c.set("isAdmin", session.user.name === "admin");
      // We can probably drop this too
      c.set("session", session.session);
    } else {
      c.set("userId", null);
      c.set("pds", "");
      c.set("isAdmin", false);
      c.set("session", null);
    }
  }
  catch (err) {
    console.error(`Failed to process authentication, got err: ${err}`);
    c.set("userId", null);
    c.set("pds", "");
    c.set("isAdmin", false);
    c.set("session", null);
  }
  await next();
}
export async function requireAuth(c: Context, next: any) { 
  if (c.get("session") === null || c.get("userId") === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
}

export const authMiddleware = every(pullAuthData, requireAuth);