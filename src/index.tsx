import { drizzle } from "drizzle-orm/d1";
import { Env, Hono } from "hono";
import { ContextVariables, createAuth } from "./auth";
import { account } from "./endpoints/account";
import { post } from "./endpoints/post";
import { preview } from "./endpoints/preview";
import { authAdminOnlyMiddleware } from "./middleware/adminOnly";
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
import { Bindings, QueueTaskData, ScheduledContext, TaskType } from "./types.d";
import { AgentMap } from "./utils/bskyAgents";
import { makeConstScript } from "./utils/constScriptGen";
import { getAllAbandonedMedia } from "./utils/db/file";
import { runMaintenanceUpdates } from "./utils/db/maintain";
import { makeInviteKey } from "./utils/inviteKeys";
import {
  cleanupAbandonedFiles, cleanUpPostsTask, handlePostTask,
  handleRepostTask, schedulePostTask
} from "./utils/scheduler";
import { setupAccounts } from "./utils/setup";

const app = new Hono<{ Bindings: Bindings, Variables: ContextVariables }>();

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

// Image preview endpoint
app.use("/preview/**", corsHelperMiddleware);
app.route("/preview", preview);

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

// Add redirects
app.all("/contact", (c) => c.redirect(c.env.REDIRECTS.contact));
app.all("/tip", (c) => c.redirect(c.env.REDIRECTS.tip));

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
app.get("/cron", authAdminOnlyMiddleware, async (c) => {
  await schedulePostTask(c);
  return c.text("ran");
});

app.get("/cron-clean", authAdminOnlyMiddleware, (c) => {
  c.executionCtx.waitUntil(cleanUpPostsTask(c));
  return c.text("ran");
});

app.get("/db-update", authAdminOnlyMiddleware, (c) => {
  c.executionCtx.waitUntil(runMaintenanceUpdates(c));
  return c.text("ran");
});

app.get("/abandoned", authAdminOnlyMiddleware, async (c) => {
  let returnHTML = "";
  const abandonedFiles: string[] = await getAllAbandonedMedia(c);
  // print out all abandoned files
  for (const file of abandonedFiles) {
    returnHTML += `${file}\n`;
  }
  if (c.env.R2_SETTINGS.auto_prune == true) {
    console.log("pruning abandoned files...");
    await cleanupAbandonedFiles(c);
  }

  if (returnHTML.length == 0) {
    returnHTML = "no files abandoned";
  }

  return c.text(returnHTML);
});

// Startup Application
app.get("/start", (c) => c.redirect('/setup'));
app.get("/startup", (c) => c.redirect('/setup'));
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
        message.retry({delaySeconds: delay*(message.attempts+1)});
      } else {
        message.ack();
      }
    }
  },
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};