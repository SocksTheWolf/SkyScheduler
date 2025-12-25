import { Env, Hono } from "hono";
import { every } from 'hono/combine'
import { createAuth, ContextVariables } from "./auth";
import { Bindings } from "./types.d";
import Home from "./pages/homepage";
import Signup from "./pages/signup";
import Dashboard from "./pages/dashboard";
import Login from "./pages/login";
import ResetPassword from "./pages/reset";
import { cleanUpPostsTask, schedulePostTask } from "./utils/scheduler";
import { doesAdminExist, compactPostedPosts } from "./utils/dbQuery";
import { authMiddleware } from "./middleware/auth";
import { adminOnlyMiddleware } from "./middleware/adminOnly";
import { corsHelperMiddleware } from "./middleware/corsHelper";
import { account } from "./endpoints/account";
import { post } from "./endpoints/post";
import { redirectToDashIfLogin } from "./middleware/redirectDash";
import ForgotPassword from "./pages/forgot";

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
app.all("/", (c) => {
  return c.html(<Home />);
});

// Dashboard route
app.get("/dashboard", authMiddleware, (c) => {
  return c.html(
    <Dashboard c={c} />
  );
});

// Login route
app.get("/login", redirectToDashIfLogin, (c) => {
  return c.html(<Login />);
});

// Signup route
app.get("/signup", redirectToDashIfLogin, (c) => {
  return c.html(<Signup c={c} />);
});

// Forgot Password route
app.get("/forgot", redirectToDashIfLogin, (c) => {
  return c.html(<ForgotPassword c={c} />);
});

// Reset Password route
app.get("/reset", redirectToDashIfLogin, (c) => {
  return c.html(<ResetPassword />);
});

app.get("/cron", every(authMiddleware, adminOnlyMiddleware), (c) => {
  schedulePostTask(c.env, c.executionCtx);
  return c.text("ran");
});

app.get("/cron-clean", every(authMiddleware, adminOnlyMiddleware), (c) => {
  c.executionCtx.waitUntil(cleanUpPostsTask(c.env, c.executionCtx));
  return c.text("ran");
});

app.get("/db-truncate", every(authMiddleware, adminOnlyMiddleware), (c) => {
  c.executionCtx.waitUntil(compactPostedPosts(c.env));
  return c.text("ran");
});

app.get("/start", async (c) => {
  if (await doesAdminExist(c))
    return c.html("already created", 501);

  const data = await c.get("auth").api.signUpEmail({
    body: {
      name: "admin",
      email: `${c.env.DEFAULT_ADMIN_USER}@skyscheduler.tld`,
      // @ts-ignore: Property does not exist (it does via an extension)
      username: c.env.DEFAULT_ADMIN_USER,
      password: c.env.DEFAULT_ADMIN_PASS,
      bskyAppPass: c.env.DEFAULT_ADMIN_BSKY_PASS
    }
  });
  if (data.token !== null)
    return c.redirect("/");
  else
    return c.html("failure", 401);
})

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