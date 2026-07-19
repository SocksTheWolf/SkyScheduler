import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { disableSSG } from "hono/ssg";
import { createAuth } from "./auth";
import { ScheduledContext } from "./classes/context";
import { account } from "./endpoints/account";
import { admin } from "./endpoints/admin";
import { post } from "./endpoints/post";
import { preview } from "./endpoints/preview";
import { staticFiles } from "./endpoints/statics";
import { blankAuthEnv } from "./middleware/auth";
import { corsHelperMiddleware } from "./middleware/corsHelper";
import { cspHelper } from "./middleware/cspHelper";
import { redirectToDashIfLogin } from "./middleware/redirectDash";
import { redirectLoginIfLogout } from "./middleware/redirectLogin";
import { secureHeadersMiddleware } from "./middleware/secureHeaders";
import { ssgGenMiddleware, ssgServe } from "./middleware/ssg";
import Dashboard from "./pages/dashboard";
import ForgotPassword from "./pages/forgot";
import Homepage from "./pages/homepage";
import Login from "./pages/login";
import PrivacyPolicy from "./pages/privacy";
import ResetPassword from "./pages/reset";
import Signup from "./pages/signup";
import TermsOfService from "./pages/tos";
import { SITE_URL } from "./siteinfo";
import type { Bindings, HonoBase, QueueTaskData } from "./types";
import { processQueue } from "./utils/queues/queueHandler";
import { handleSchedule } from "./utils/scheduler";
import { setupAccounts } from "./utils/setup";

const app = new Hono<HonoBase>();
app.use(blankAuthEnv);
app.use(csrf({origin: SITE_URL}));
app.use(secureHeadersMiddleware);
app.use(corsHelperMiddleware);
app.use(cspHelper);
app.use(ssgGenMiddleware);

///// Static Files /////
app.route("/", staticFiles);

///// Static Pages /////
app.all("/", ssgServe({page: "index"}), (c) => c.html(<Homepage ctx={c} />));
app.get("/tos", ssgServe(), (c) => c.html(<TermsOfService ctx={c} />));
app.get("/privacy", ssgServe(), (c) => c.html(<PrivacyPolicy ctx={c} />));

///// Inline Middleware /////
// Middleware for authentication/sessions
app.use("*", async (c, next) => {
  if (c.get("db") == undefined)
    c.set("db", drizzle(c.env.DB));
  c.set("auth", createAuth(c, (c.req.raw as any).cf || {}));
  await next();
});

///// Application Routes /////

// Dashboard route
app.get("/dashboard", redirectLoginIfLogout, disableSSG(), (c) => c.html(<Dashboard ctx={c} />));

// Login route
app.get("/login", redirectToDashIfLogin, ssgServe(), (c) => c.html(<Login ctx={c} />));

// Signup route
app.get("/signup", redirectToDashIfLogin, ssgServe(), (c) => c.html(<Signup ctx={c} />));

// Forgot Password route
app.get("/forgot", redirectToDashIfLogin, ssgServe(), (c) => c.html(<ForgotPassword ctx={c} />));

// Reset Password route
app.get("/reset", redirectToDashIfLogin, ssgServe(), (c) => c.html(<ResetPassword ctx={c} />));

///// Endpoint Routes /////
app.use(disableSSG());

// Handle all BetterAuth routes
app.all("/api/auth/*", async (c) => {
  const auth = c.get("auth");
  return auth.handler(c.req.raw);
});

// Account routes
app.route("/account", account);

// Posts routes
app.route("/post", post);

// Admin routes
app.route("/admin", admin);

// Image preview routes
app.route("/preview", preview);

// Reset Password Confirm route
app.get("/reset-password/:id", (c) => {
  // Alternatively you can just URL rewrite this in cloudflare and it'll look
  // 100x times better.
  const { id } = c.req.param();
  return c.redirect(`/api/auth/reset-password/${id}?callbackURL=%2Freset`);
});

// Setup Application route
app.get("/setup", async (c) => await setupAccounts(c));

///// Internal Application Exports /////

export default {
  scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    handleSchedule(new ScheduledContext(env, ctx), event.cron);
  },
  async queue(batch: MessageBatch<QueueTaskData>, env: Bindings, ctx: ExecutionContext) {
    await processQueue(batch, env, ctx);
  },
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
  getApp() {
    return app;
  }
};