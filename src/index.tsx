import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { cache } from "hono/cache";
import { csrf } from "hono/csrf";
import isEmpty from "just-is-empty";
import { ContextVariables, createAuth } from "./auth";
import { ScheduledContext } from "./classes/context";
import { account } from "./endpoints/account";
import { admin } from "./endpoints/admin";
import { post } from "./endpoints/post";
import { preview } from "./endpoints/preview";
import { blankAuthEnv } from "./middleware/auth";
import { corsHelperMiddleware } from "./middleware/corsHelper";
import { redirectToDashIfLogin } from "./middleware/redirectDash";
import { redirectLoginIfLogout } from "./middleware/redirectLogin";
import Dashboard from "./pages/dashboard";
import ForgotPassword from "./pages/forgot";
import Homepage from "./pages/homepage";
import Login from "./pages/login";
import PrivacyPolicy from "./pages/privacy";
import ResetPassword from "./pages/reset";
import Signup from "./pages/signup";
import TermsOfService from "./pages/tos";
import { ATPROTO_DID, SITE_URL } from "./siteinfo";
import { Bindings, QueueTaskData } from "./types";
import { makeConstScript } from "./utils/constScriptGen";
import { processQueue } from "./utils/queues/queueHandler";
import { handleSchedule } from "./utils/scheduler";
import { setupAccounts } from "./utils/setup";

const app = new Hono<{ Bindings: Bindings, Variables: ContextVariables }>();
app.use(blankAuthEnv);
app.use(csrf({origin: SITE_URL}));

///// Static Pages /////

// caches
const staticFilesCache = cache({ cacheName: 'statics', cacheControl: 'max-age=604800, must-revalidate, proxy-revalidate' });
const staticPagesCache = cache({ cacheName: 'pages', cacheControl: 'max-age=259200, must-revalidate, proxy-revalidate' });

// Root route
app.all("/", staticPagesCache, (c) => c.html(<Homepage />));

// atproto registration route
if (!isEmpty(ATPROTO_DID)) {
  app.get("/.well-known/atproto-did", staticFilesCache, (c) => c.text(ATPROTO_DID, 200));
}

// JS injection of const variables
app.get("/js/consts.js", staticFilesCache, (c) => {
  const constScript = makeConstScript();
  return c.body(constScript, 200, {'Content-Type': 'text/javascript'});
});

// Write the robots.txt file dynamically
app.get("/robots.txt", staticFilesCache, async (c) => {
  const origin: string = new URL(c.req.url).origin;
  const robotsFile = await c.env.ASSETS!.fetch(`${origin}/robots.txt`)
    .then(async (resp) => await resp.text());
  return c.text(`${robotsFile}\nSitemap: ${SITE_URL}/sitemap.xml`, 200);
});

// Legal linkies
app.get("/tos", staticPagesCache, (c) => c.html(<TermsOfService />));
app.get("/privacy", staticPagesCache, (c) => c.html(<PrivacyPolicy />));

// Add redirects
app.get("/bsky", (c) => c.redirect(c.env.REDIRECTS.bsky_profile || c.env.REDIRECTS.contact));
app.get("/contact", (c) => c.redirect(c.env.REDIRECTS.contact));
app.get("/tip", (c) => c.redirect(c.env.REDIRECTS.tip || SITE_URL));
app.get("/terms", (c) => c.redirect("/tos"));

///// Inline Middleware /////
// CORS configuration for auth routes
app.use("/api/auth/**", corsHelperMiddleware);

// Middleware to initialize auth instance for each request
app.use("*", async (c, next) => {
  const auth = createAuth(c.env, (c.req.raw as any).cf || {});
  c.set("auth", auth);
  c.set("db", drizzle(c.env.DB));
  await next();
});

// Handle auth for all better auth as well.
app.all("/api/auth/*", async (c) => {
  const auth = c.get("auth");
  return auth.handler(c.req.raw);
});

// Account endpoints
app.route("/account", account);

// Posts endpoints
app.route("/post", post);

// Admin endpoints
app.route("/admin", admin);

// Image preview endpoint
app.route("/preview", preview);

// Dashboard route
app.get("/dashboard", redirectLoginIfLogout, (c) => c.html(<Dashboard ctx={c} />));

// Login route
app.get("/login", redirectToDashIfLogin, (c) => c.html(<Login />));

// Signup route
app.get("/signup", redirectToDashIfLogin, (c) => c.html(<Signup ctx={c} />));

// Forgot Password route
app.get("/forgot", redirectToDashIfLogin, (c) => c.html(<ForgotPassword ctx={c} />));

// Reset Password route
app.get("/reset", redirectToDashIfLogin, (c) => c.html(<ResetPassword />));

// Reset Password Confirm route
app.get("/reset-password/:id", (c) => {
  // Alternatively you can just URL rewrite this in cloudflare and it'll look
  // 100x times better.
  const { id } = c.req.param();
  return c.redirect(`/api/auth/reset-password/${id}?callbackURL=%2Freset`);
});

// Startup Application
app.get("/setup", async (c) => await setupAccounts(c));

export default {
  scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    const runtimeWrapper = new ScheduledContext(env, ctx);
    handleSchedule(runtimeWrapper, event.cron);
  },
  async queue(batch: MessageBatch<QueueTaskData>, env: Bindings, ctx: ExecutionContext) {
    await processQueue(batch, env, ctx);
  },
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  }
};