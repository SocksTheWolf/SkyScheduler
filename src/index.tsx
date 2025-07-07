import { Env, Hono } from "hono";
import { every } from 'hono/combine'
import { cors } from "hono/cors";
import { auth, createAuth } from "./auth";
import { Bindings } from "./types.d";
import Home from "./pages/homepage";
import Signup from "./pages/signup";
import Dashboard from "./pages/dashboard";
import { schedulePostTask } from "./utils/scheduler";
import { createPost, deletePost, doesAdminExist, doesUserExist, getPostById } from "./utils/dbQuery";
import { createPostObject } from "./utils/helpers";
import { makePost } from "./utils/bskyApi";
import { ScheduledPostList } from "./layout/postList";
import { authMiddleware } from "./middleware/auth";
import { adminOnlyMiddleware } from "./middleware/adminOnly";
import { uploadFileR2 } from "./utils/r2Query";
import { SignupSchema } from "./utils/signupSchema";

type Variables = {
    auth: ReturnType<typeof createAuth>;
};

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

///// Inline Middleware /////
// CORS configuration for auth routes
app.use("/api/auth/**", async (c, next) => {
  const middleware = cors({
      origin: c.env.BETTER_AUTH_URL,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["POST", "GET", "OPTIONS"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
      credentials: true,
  });
  return middleware(c, next);
});

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

// proxy the logout call because of course this wouldn't work properly anyways
app.post("/logout", authMiddleware, async (c) => {
  try {
    const auth = c.get("auth");
    await auth.api.signOut(c.req.raw);
  } catch(err) {
    console.error(`Unable to handle logout properly, redirecting anyways. ${err}`);
  }

  // Redirect to home
  c.header("HX-Redirect", "/");
  return c.html("Success");
});

// Create media upload
app.post("/upload", authMiddleware, async (c) => {
  const formData = await c.req.parseBody();
  const fileUploadResponse = await uploadFileR2(c.env, formData['file']);
  if (fileUploadResponse.success === false) {
    return c.json(fileUploadResponse, 400);
  }
  return c.json(fileUploadResponse, 200);
});

// Delete an upload
app.delete("/upload", authMiddleware, async (c) => {
  const data = await c.req.json();
  const fileKey: string = data['key'];

  // this can never fail
  await c.env.R2.delete(fileKey);
  return c.json({"success": true}, 200);
});

// Create post
app.post("/post", authMiddleware, async (c) => {
  const body = await c.req.json();
  const response = await createPost(c, body);
  if (!response.ok) {
    return c.json({message: response.msg}, 400);
  } else if (response.postNow) {
    const postInfo = await getPostById(c.env, response.postId);
    const postResponse = await makePost(c.env, createPostObject(postInfo[0]));
    if (postResponse === false) {
      return c.json({message: "Failed to post content immediately..."}, 400);
    }
  }
  return c.json({ message: "Post scheduled successfully" });
});

// Get all posts
app.get("/posts", authMiddleware, async (c) => {
  c.header("HX-Trigger-After-Swap", "timeSidebar");
  return c.html(
    <ScheduledPostList ctx={c} />
  );
});

// delete a post
app.post("/post/:id/delete", authMiddleware, async (c) => {
  const { id } = c.req.param();
  await deletePost(c.env, id);

  c.header("HX-Trigger-After-Swap", "showDeleteMsg");
  return c.redirect("/posts");
});

// Root route with login form
app.get("/", (c) => {
  return c.html(<Home />);
});

// Dashboard route
app.get("/dashboard", authMiddleware, (c) => {
  return c.html(
    <Dashboard c={c} />
  );
});

// Signup route
app.get("/signup", (c) => {
  return c.html(<Signup />);
});

app.post("/signup", async (c) => {
  const body = await c.req.json();
  const validation = SignupSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ ok: false, msg: validation.error.toString() }, 400);
  }

  const { signupToken, username, password, bskyAppPassword } = validation.data;
  if (await doesUserExist(c, username)) {
    return c.json({ok: false, msg: "user already exists"}, 401);
  }

  if (signupToken !== c.env.SIGNUP_TOKEN_SECRET) {
    return c.json({ok: false, msg: "invalid signup token value"}, 400);
  }

  // create the user
  const createUser = await c.get("auth").api.signUpEmail({
    body: {
      name: username,
      email: `${username}@skyscheduler.tld`,
      username: username,
      password: password,
      bskyAppPass: bskyAppPassword
    }
  });

  if (createUser.token !== null) {
    return c.json({ok: true, msg: "user created"});
  }
  return c.json({ok: false, msg: "unknown error occurred"});
});

app.get("/cron", every(authMiddleware, adminOnlyMiddleware), (c) => {
  schedulePostTask(c.env, c.executionCtx);
  return c.text("ran");
});

app.get("/start", async (c) => {
  if (await doesAdminExist(c))
    return c.html("already created", 501);

  const data = await c.get("auth").api.signUpEmail({
    body: {
      name: "admin",
      email: `${c.env.DEFAULT_ADMIN_USER}@skyscheduler.tld`,
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
    ctx.waitUntil(schedulePostTask(env, ctx));
  },

  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};