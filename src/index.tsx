import { Env, Hono } from "hono";
import { createAuth, ContextVariables } from "./auth";
import { Bindings } from "./types.d";
import Home from "./pages/homepage";
import Signup from "./pages/signup";
import Dashboard from "./pages/dashboard";
import Login from "./pages/login";
import ResetPassword from "./pages/reset";
import ForgotPassword from "./pages/forgot";
import TermsOfService from "./pages/tos";
import PrivacyPolicy from "./pages/privacy";
import { cleanUpPostsTask, schedulePostTask } from "./utils/scheduler";
import { compactPostedPosts } from "./utils/dbQuery";
import { setupAccounts } from "./utils/setup";
import { makeInviteKey } from "./utils/inviteKeys";
import { makeConstScript } from "./utils/constScriptGen";
import { authMiddleware } from "./middleware/auth";
import { authAdminOnlyMiddleware } from "./middleware/adminOnly";
import { corsHelperMiddleware } from "./middleware/corsHelper";
import { redirectToDashIfLogin } from "./middleware/redirectDash";
import { account } from "./endpoints/account";
import { post } from "./endpoints/post";

const app = new Hono<{ Bindings: Bindings, Variables: ContextVariables }>();

///// Inline Middleware /////
// CORS configuration for auth routes
app.use("/api/auth/**", corsHelperMiddleware);

// Middleware to initialize auth instance for each request
app.use("*", async (c, next) => {
  const auth = createAuth(c.env, (c.req.raw as any).cf || {});
  c.set("auth", auth);
  await next();
});

// Handle auth for all better auth as well.
app.all("/api/auth/*", async (c) => {
  const auth = c.get("auth");
  return auth.handler(c.req.raw);
});

// Account endpoints
app.use("/account/**", corsHelperMiddleware);
app.route("/account", account);

// Posts endpoints
app.use("/post/**", corsHelperMiddleware);
app.route("/post", post);

// Root route
app.all("/", (c) => c.html(<Home />));

// JS injection of const variables
app.get("/js/consts.js", (c) => {
  const constScript = makeConstScript();
  return c.body(constScript, 200, {
    'Content-Type': 'text/javascript',
    'Cache-Control': 'max-age=604800'
  });
});

// Add contact link
app.all("/contact", (c) => c.redirect(c.env.CONTACT_LINK));

// Legal linkies
app.get("/tos", (c) => c.html(<TermsOfService />));
app.get("/privacy", (c) => c.html(<PrivacyPolicy />));

// Dashboard route
app.get("/dashboard", authMiddleware, (c) => c.html(<Dashboard c={c} />));

// Login route
app.get("/login", redirectToDashIfLogin, (c) => c.html(<Login />));

// Signup route
app.get("/signup", redirectToDashIfLogin, (c) => c.html(<Signup c={c} />));

// Forgot Password route
app.get("/forgot", redirectToDashIfLogin, (c) => c.html(<ForgotPassword c={c} />));

// Reset Password route
app.get("/reset", redirectToDashIfLogin, (c) => c.html(<ResetPassword />));

// Generate invites route
app.get("/invite", authAdminOnlyMiddleware, (c) => {
  const newKey = makeInviteKey(c);
  if (newKey !== null)
    return c.text(`${newKey} is good for 10 uses`);
  else
    return c.text("Invite keys are disabled.");
});

// Admin Maintenance Cleanup
app.get("/cron", authAdminOnlyMiddleware, (c) => {
  schedulePostTask(c.env, c.executionCtx);
  return c.text("ran");
});

app.get("/cron-clean", authAdminOnlyMiddleware, (c) => {
  c.executionCtx.waitUntil(cleanUpPostsTask(c.env, c.executionCtx));
  return c.text("ran");
});

app.get("/db-truncate", authAdminOnlyMiddleware, (c) => {
  c.executionCtx.waitUntil(compactPostedPosts(c.env));
  return c.text("ran");
});

// Startup Application
app.get("/start", (c) => c.redirect('/setup'));
app.get("/startup", (c) => c.redirect('/setup'));
app.get("/setup", async (c) => await setupAccounts(c));

export default {
  scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    switch (event.cron) {
      case "30 17 * * sun":
        ctx.waitUntil(cleanUpPostsTask(env, ctx));
      break;
      default:
      case "0 * * * *":
        ctx.waitUntil(schedulePostTask(env, ctx));
      break;
    }
  },
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};