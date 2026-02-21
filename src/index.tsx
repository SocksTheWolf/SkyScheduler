import { drizzle } from "drizzle-orm/d1";
import { Env, Hono } from "hono";
import { ContextVariables, createAuth } from "./auth";
import { account } from "./endpoints/account";
import { admin } from "./endpoints/admin";
import { post } from "./endpoints/post";
import { preview } from "./endpoints/preview";
import { authMiddleware } from "./middleware/auth";
import { corsHelperMiddleware } from "./middleware/corsHelper";
import { redirectToDashIfLogin } from "./middleware/redirectDash";
import Dashboard from "./pages/dashboard";
import ForgotPassword from "./pages/forgot";
import Home from "./pages/homepage";
import Login from "./pages/login";
import PrivacyPolicy from "./pages/privacy";
import ResetPassword from "./pages/reset";
import Signup from "./pages/signup";
import TermsOfService from "./pages/tos";
import { SITE_URL } from "./siteinfo";
import { Bindings, QueueTaskData, ScheduledContext, TaskType } from "./types.d";
import { AgentMap } from "./utils/bskyAgents";
import { makeConstScript } from "./utils/constScriptGen";
import {
  cleanUpPostsTask, handlePostTask,
  handleRepostTask, schedulePostTask
} from "./utils/scheduler";
import { setupAccounts } from "./utils/setup";

const app = new Hono<{ Bindings: Bindings, Variables: ContextVariables }>();

///// Static Pages /////

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

// Write the robots.txt file dynamically
app.get("/robots.txt", async (c) => {
  const origin = new URL(c.req.url).origin;
  const robotsFile = await c.env.ASSETS!.fetch(`${origin}/robots.txt`)
    .then(async (resp) => await resp.text());
  return c.text(`${robotsFile}\nSitemap: ${SITE_URL}/sitemap.xml`, 200, {
    'Content-Type': 'text/plain',
    'Cache-Control': 'max-age=604800'
  });
});

// Add redirects
app.all("/contact", (c) => c.redirect(c.env.REDIRECTS.contact));
app.all("/tip", (c) => c.redirect(c.env.REDIRECTS.tip));

// Legal linkies
app.get("/tos", (c) => c.html(<TermsOfService />));
app.get("/privacy", (c) => c.html(<PrivacyPolicy />));

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
app.use("/account/**", corsHelperMiddleware);
app.route("/account", account);

// Posts endpoints
app.use("/post/**", corsHelperMiddleware);
app.route("/post", post);

// Admin endpoints
app.use("/admin/**", corsHelperMiddleware);
app.route("/admin", admin);

// Image preview endpoint
app.use("/preview/**", corsHelperMiddleware);
app.route("/preview", preview);

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

// Startup Application
app.get("/setup", async (c) => await setupAccounts(c));

export default {
  scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    const runtimeWrapper = new ScheduledContext(env, ctx);
    switch (event.cron) {
      case "30 17 * * sun":
        ctx.waitUntil(cleanUpPostsTask(runtimeWrapper));
      break;
      default:
      case "0 * * * *":
        ctx.waitUntil(schedulePostTask(runtimeWrapper));
      break;
    }
  },
  async queue(batch: MessageBatch<QueueTaskData>, env: Bindings, ctx: ExecutionContext) {
    const runtimeWrapper = new ScheduledContext(env, ctx);
    const delay: number = env.QUEUE_SETTINGS.delay_val;
    const agency = new AgentMap(env.TASK_SETTINGS);
    let wasSuccess: boolean = false;
    for (const message of batch.messages) {
      const agent = await agency.getOrAddAgentFromObj(runtimeWrapper, message.body.post || message.body.repost, message.body.type);
      switch (message.body.type) {
        case TaskType.Post:
          wasSuccess = await handlePostTask(runtimeWrapper, message.body.post!, agent);
        break;
        case TaskType.Repost:
          wasSuccess = await handleRepostTask(runtimeWrapper, message.body.repost!, agent);
        break;
        default:
        case TaskType.None:
          console.error("Got a message queue task type that was invalid");
          message.ack();
          return;
      }
      // Handle queue acknowledgement on success/failure
      if (!wasSuccess) {
        const delaySeconds = delay*(message.attempts+1);
        console.log(`attempting to retry message in ${delaySeconds}`);
        message.retry({delaySeconds: delaySeconds});
      } else {
        message.ack();
      }
    }
  },
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};