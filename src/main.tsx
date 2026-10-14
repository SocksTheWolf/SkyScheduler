import { Hono } from "hono";
import { every } from "hono/combine";
import { csrf } from "hono/csrf";
import { disableSSG } from "hono/ssg";
import { SITE_URL } from "./appInfo";
import { processAuthRoute } from "./auth";
import { ScheduledContext } from "./classes/context";
import { account } from "./endpoints/account";
import { admin } from "./endpoints/admin";
import { post } from "./endpoints/post";
import { preview } from "./endpoints/preview";
import { setup } from "./endpoints/setup";
import { FundingProgress } from "./layout/helpers/fundProgress";
import { blankAuthEnv } from "./middleware/auth";
import { cachePrivateMiddleware, cachePublicMiddleware } from "./middleware/cacheControl";
import { corsHelperMiddleware } from "./middleware/corsHelper";
import { cspHelper } from "./middleware/cspHelper";
import { redirectToDashIfLogin } from "./middleware/redirectDash";
import { redirectLoginIfLogout } from "./middleware/redirectLogin";
import { secureHeadersMiddleware } from "./middleware/secureHeaders";
import { sessionMiddleware } from "./middleware/session";
import { ssgGenMiddleware, ssgServe } from "./middleware/ssg";
import Dashboard from "./pages/dashboard";
import ForgotPassword from "./pages/forgot";
import Homepage from "./pages/index";
import Login from "./pages/login";
import PrivacyPolicy from "./pages/privacy";
import ResetPassword from "./pages/reset";
import Signup from "./pages/signup";
import TermsOfService from "./pages/tos";
import type { HonoBase, QueueTaskData } from "./types";
import { processQueue } from "./utils/queues/queueHandler";
import { handleSchedule } from "./utils/scheduler";

const app = new Hono<HonoBase>();
app.use(blankAuthEnv);
app.use(csrf({ origin: SITE_URL }), secureHeadersMiddleware, cspHelper, corsHelperMiddleware);
app.use(ssgGenMiddleware);

///// SSG Middlewares /////
const ssgServePrivate = every(cachePrivateMiddleware, ssgServe());
const ssgServePublic = every(cachePublicMiddleware, ssgServe());

///// Static Pages /////
app.all("/", cachePublicMiddleware, ssgServe({ page: "index" }), (c) =>
  c.html(<Homepage ctx={c} />)
);
app.get("/tos", ssgServePublic, (c) => c.html(<TermsOfService ctx={c} />));
app.get("/privacy", ssgServePublic, (c) => c.html(<PrivacyPolicy ctx={c} />));
app.get("/login", ssgServePublic, (c) => c.html(<Login ctx={c} />));
app.get("/signup", ssgServePublic, (c) => c.html(<Signup ctx={c} />));
app.get("/forgot", ssgServePublic, (c) => c.html(<ForgotPassword ctx={c} />));
app.get("/funding", cachePublicMiddleware, disableSSG(), (c) => c.html(<FundingProgress ctx={c} />));

///// Application Routes /////

// Dashboard route
app.get("/dashboard", redirectLoginIfLogout, ssgServePrivate, (c) => c.html(<Dashboard ctx={c} />));

// Login/Dashboard route (redirects if logged in, otherwise asks for login)
app.get("/app", redirectToDashIfLogin, cachePrivateMiddleware, (c) => c.redirect("/login"));

// Reset Password route
app.get("/reset", redirectToDashIfLogin, ssgServePrivate, (c) => c.html(<ResetPassword ctx={c} />));

///// Endpoint Routes /////
app.use(cachePrivateMiddleware, disableSSG());

// Handle better-auth routes manually
// This makes (nearly) everything run on the server, rather than the client
//app.all("/api/auth/*", sessionMiddleware, async (c) => processAuthRoute(c));
app.all("/api/auth/reset-password/*", sessionMiddleware, async (c) => processAuthRoute(c));

// Account routes
app.route("/account", account);

// Posts routes
app.route("/post", post);

// Admin routes
app.route("/admin", admin);

// Image preview routes
app.route("/preview", preview);

// Setup route
app.route("/setup", setup);

// Reset Password Confirm route
app.get("/reset-password/:id", sessionMiddleware, (c) => {
  // Alternatively you can just URL rewrite this in cloudflare and it'll look
  // 100x times better.
  const { id } = c.req.param();
  // the default is 302, but we'll force it for future proofing
  return c.redirect(`/api/auth/reset-password/${id}?callbackURL=%2Freset`, 302);
});

///// Internal Application Exports /////

export default {
  scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    handleSchedule(new ScheduledContext(env, ctx), event.cron);
  },
  async queue(batch: MessageBatch<QueueTaskData>, env: Env, ctx: ExecutionContext) {
    await processQueue(batch, env, ctx);
  },
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // to clear the cache, call clearWorkersCache
    return app.fetch(request, env, ctx);
  },
  getApp() {
    return app;
  },
};
