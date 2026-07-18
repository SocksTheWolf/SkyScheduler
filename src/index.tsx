import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { cache } from "hono/cache";
import { csrf } from "hono/csrf";
import isEmpty from "just-is-empty";
import { type ContextVariables, createAuth } from "./auth";
import { ScheduledContext } from "./classes/context";
import { account } from "./endpoints/account";
import { admin } from "./endpoints/admin";
import { generateOpenAPI } from "./endpoints/openapi";
import { post } from "./endpoints/post";
import { preview } from "./endpoints/preview";
import { blankAuthEnv } from "./middleware/auth";
import { corsHelperMiddleware } from "./middleware/corsHelper";
import { cspHelper } from "./middleware/cspHelper";
import { onlyInDevelopment } from "./middleware/inDevOnly";
import { redirectToDashIfLogin } from "./middleware/redirectDash";
import { redirectLoginIfLogout } from "./middleware/redirectLogin";
import { secureHeadersMiddleware } from "./middleware/secureHeaders";
import Dashboard from "./pages/dashboard";
import ForgotPassword from "./pages/forgot";
import Homepage from "./pages/homepage";
import Login from "./pages/login";
import PrivacyPolicy from "./pages/privacy";
import ResetPassword from "./pages/reset";
import Signup from "./pages/signup";
import TermsOfService from "./pages/tos";
import { ATPROTO_DID, SITE_URL } from "./siteinfo";
import { appManifestGenerate } from "./statics/appManifest";
import { makeConstScript } from "./statics/constScript";
import { robotsGenerate } from "./statics/robotsGenerator";
import type { Bindings, QueueTaskData } from "./types";
import { processQueue } from "./utils/queues/queueHandler";
import { handleSchedule } from "./utils/scheduler";
import { setupAccounts } from "./utils/setup";

const app = new Hono<{ Bindings: Bindings, Variables: ContextVariables }>();
app.use(blankAuthEnv);
app.use(csrf({origin: SITE_URL}));
app.use(secureHeadersMiddleware);

///// Static Files /////

// caches
const staticFilesCache = cache({ cacheName: 'statics', cacheControl: 'max-age=604800, must-revalidate, proxy-revalidate' });

// atproto registration route
if (!isEmpty(ATPROTO_DID)) {
  app.get("/.well-known/atproto-did", staticFilesCache, (c) => c.text(ATPROTO_DID, 200));
}

// JS injection of const variables
app.get("/js/consts.js", staticFilesCache, (c) => {
  return c.body(makeConstScript(), 200, {'Content-Type': 'text/javascript'});
});

// Write the robots.txt file dynamically
app.get("/robots.txt", staticFilesCache, async (c) => {
  return c.text(robotsGenerate(), 200);
});

// Write site.webmanifest dynamically
app.get("/site.webmanifest", staticFilesCache, (c) => {
  return c.json(appManifestGenerate());
});

app.get('/openapi.json', onlyInDevelopment, async (c) => {
  return c.json(await generateOpenAPI(c));
});

///// Static Pages /////

// Start using CSP from here onwards
app.use(cspHelper);
app.all("/", (c) => c.html(<Homepage ctx={c} />));
app.get("/tos", (c) => c.html(<TermsOfService ctx={c} />));
app.get("/privacy", (c) => c.html(<PrivacyPolicy ctx={c} />));

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
app.get("/login", redirectToDashIfLogin, (c) => c.html(<Login ctx={c} />));

// Signup route
app.get("/signup", redirectToDashIfLogin, (c) => c.html(<Signup ctx={c} />));

// Forgot Password route
app.get("/forgot", redirectToDashIfLogin, (c) => c.html(<ForgotPassword ctx={c} />));

// Reset Password route
app.get("/reset", redirectToDashIfLogin, (c) => c.html(<ResetPassword ctx={c} />));

// Reset Password Confirm route
app.get("/reset-password/:id", (c) => {
  // Alternatively you can just URL rewrite this in cloudflare and it'll look
  // 100x times better.
  const { id } = c.req.param();
  return c.redirect(`/api/auth/reset-password/${id}?callbackURL=%2Freset`);
});

// Startup Application
app.get("/setup", async (c) => await setupAccounts(c));

// Worker workflow classes to export back to main
export { UploadVideoAndPublishWorkflow } from "./utils/workflows/uploadAndPublish";

// Default CF exports
export default {
  scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    handleSchedule(new ScheduledContext(env, ctx), event.cron);
  },
  async queue(batch: MessageBatch<QueueTaskData>, env: Bindings, ctx: ExecutionContext) {
    await processQueue(batch, env, ctx);
  },
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  }
};