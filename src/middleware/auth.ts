import { every } from "hono/combine";
import { createMiddleware } from "hono/factory";
import { html } from "hono/html";
import { isSSGContext } from "hono/ssg";
import type { BaseContext, RequireAuthMiddlewareProps } from "../types";
import { logoutAccount } from "../utils/helpers";

function clearContext(c: BaseContext) {
  c.set("userId", null);
  c.set("pds", "");
  c.set("isAdmin", false);
  c.set("session", null);
  c.set("db", null);
  c.set("ssg", isSSGContext(c));
}

// Resets all environment variables to a blank state
// this is so that they have default values, makes it easier to
// query things like in the ratelimit middleware
export async function blankAuthEnv(c: BaseContext, next: any) {
  clearContext(c);
  await next();
};

// Middleware to verify authentication
export async function pullAuthData(c: BaseContext, next: any) {
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
    }
  } catch (err: unknown) {
    console.error(`Failed to process authentication, got err: %s`, err);
    clearContext(c);
  }
  await next();
};

export function requireAuthEx(props: RequireAuthMiddlewareProps) {
  return createMiddleware(async (c: BaseContext, next: any) => {
    if (!hasAuth(c)) {
      if (props.forceLogout) {
        await logoutAccount(c);
        c.header("Clear-Site-Data", "cookies");
        c.header("HX-Redirect", "/?logout");
      } else {
        c.header("HX-Trigger-After-Swap", "accountLoginExpire");
      }

      if (props.returnHTML)
        return c.html(html`<b class="btn-error">Session Invalid, please sign in again</b>`, 401);
      else
        return c.json({ ok: false, msg: "Unauthorized" }, 401);
    }
    await next();
  });
}

export async function requireAuth(c: BaseContext, next: any) {
  if (!hasAuth(c)) {
    return c.json({ ok: false, msg: "Unauthorized" }, 401);
  }
  await next();
};

export function hasAuth(c: BaseContext) {
  return (c.get("session") !== null && c.get("userId") !== null);
};

export const authMiddleware = every(pullAuthData, requireAuth);
// displays error message, pushes event to log you out in a few seconds
export const authMiddlewareHTML = every(pullAuthData, requireAuthEx({returnHTML: true}));
// force logs you out. Usually you should use this one unless it's really dire
export const authMiddlewareHTMLLogout = every(pullAuthData, requireAuthEx({returnHTML: true, forceLogout: true}));
