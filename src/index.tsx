import { Context, Env, Hono } from "hono";
import { cors } from "hono/cors";
import { auth, createAuth } from "./auth";
import Home from "./pages/homepage";
import Dashboard from "./pages/dashboard";
import { schedulePostTask } from "./utils/scheduler";
import { Bindings, Post } from "./types.d";
import { R2_FILE_SIZE_LIMIT, BSKY_FILE_SIZE_LIMIT, TO_MB, BSKY_MAX_WIDTH, BSKY_MAX_HEIGHT } from "./limits.d";
import { v4 as uuidv4 } from 'uuid';
import { createPost, deletePost, doesAdminExist, getPostById, getPostsForUser } from "./utils/dbQuery";
import { createPostObject } from "./utils/helpers";
import { makePost } from "./utils/bskyApi";

type Variables = {
    auth: ReturnType<typeof createAuth>;
};

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

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

app.all("/api/auth/*", async c => {
    const auth = c.get("auth");
    return auth.handler(c.req.raw);
});

// Middleware to verify authentication
async function authMiddleware(c: Context, next: any) {
  const auth = c.get("auth");
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers
    });
    if (session?.session && session?.user) {
      c.set("user", session.user);
      c.set("session", session.session);
      await next();
      return;
    }
  }
  catch (err) {
    console.error(`Failed to process authentication, got err: ${err}`);
  }
  c.set("user", null);
  c.set("session", null);
  return c.json({ error: "Unauthorized" }, 401);
}

// Create media upload
app.post("/upload", authMiddleware, async (c) => {
  const formData = await c.req.parseBody();
  const file = formData['file'];
  let finalQualityLevel = 100;

  if (!(file instanceof File)) {
    console.warn("Failed to upload", 400);
    return c.json({"success": false, "error": "data invalid"}, 400);
  }

  const originalName = file.name;
  let finalFileSize = file.size;

  // The file size limit for R2 without chunking
  if (file.size > R2_FILE_SIZE_LIMIT) {
    return c.json({"success": false, "error": `max file size is ${R2_FILE_SIZE_LIMIT * TO_MB}MB`}, 400);
  }

  let fileToProcess: ArrayBuffer|ReadableStream = await file.arrayBuffer();
  // We need to double check this image for various size information.
  const imageMetaData = await c.env.IMAGES.info(await file.stream());
  // If the image is over any bsky limits, we will need to resize it
  if (file.size > BSKY_FILE_SIZE_LIMIT || imageMetaData.width > BSKY_MAX_WIDTH || imageMetaData.height > BSKY_MAX_HEIGHT) {
    let failedToResize = true;

    if (c.env.USE_IMAGE_TRANSFORMS) {
      const degradePerStep:number = c.env.IMAGE_DEGRADE_PER_STEP;
      var attempts:number = 1;
      do {
        const qualityLevel:number = 100 - degradePerStep*attempts;
        const response = (
          await c.env.IMAGES.input(await file.stream())
            .transform({ width: BSKY_MAX_WIDTH, height: BSKY_MAX_HEIGHT, fit: "scale-down", quality: qualityLevel, metadata: "copyright" })
            .output({ format: "image/jpeg" })
        ).response();

        // Break the responses into two streams so that we can read the data as both an info as well as the actual R2 upload
        const [infoStream, dataStream] = await response.body.tee();

        // Figure out how big of a transform this was
        const transformInfo = await c.env.IMAGES.info(infoStream);
        console.log(`Attempting quality level ${qualityLevel}% for ${file.name}, size: ${transformInfo.fileSize}`);

        // If we make the file size less than the actual limit 
        if (transformInfo.fileSize < BSKY_FILE_SIZE_LIMIT) {
          console.log(`${originalName}: Quality level ${qualityLevel}% processed, fits correctly with size.`);
          failedToResize = false;
          // Set some extra variables
          finalQualityLevel = qualityLevel;
          finalFileSize = transformInfo.fileSize;
          fileToProcess = dataStream;
          break;
        } else {
          // Print how over the image was if we cannot properly resize it
          console.log(`${originalName}: file size was ${transformInfo.fileSize} which is ${transformInfo.fileSize - BSKY_FILE_SIZE_LIMIT} over the appropriate size`);
        }
        ++attempts;
      } while (attempts < c.env.MAX_IMAGE_QUALITY_STEPS);
    }

    if (failedToResize)
      return c.json({"success": false, "originalName": originalName, "error": `image is too large for bsky, size is over by ${file.size - BSKY_FILE_SIZE_LIMIT}MB, 
          with width ${imageMetaData.width} and height ${imageMetaData.height}`}, 400);
  }
  
  const fileExt = originalName.split(".").pop();
  const fileName = `${uuidv4()}.${fileExt}`;

  const R2UploadRes = await c.env.R2.put(fileName, fileToProcess);
  if (R2UploadRes)
    return c.json({"success": true, "data": R2UploadRes.key, "originalName": originalName, "qualityLevel": finalQualityLevel, "fileSize": finalFileSize}, 200);
  else
    return c.json({"success": false, "error": "unable to push to R2"}, 501);
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
app.post("/posts", authMiddleware, async (c) => {
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
  const allPosts = await getPostsForUser(c);
  return c.json(allPosts);
});

app.post("/posts/:id/delete", authMiddleware, async (c) => {
  const { id } = c.req.param();
  await deletePost(c.env, id);

  return c.redirect("/dashboard?deleted=true");
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

app.get("/cron", authMiddleware, (c) => {
  schedulePostTask(c.env, c.executionCtx);
  return c.text("ran");
});

app.get("/start", async (c) => {
  if (await doesAdminExist(c))
    return c.html("not found", 404);

  const data = await c.get("auth").api.signUpEmail({
    body: {
      name: "admin",
      email: `${c.env.DEFAULT_ADMIN_USER}@skyscheduler.tld`,
      username: c.env.DEFAULT_ADMIN_USER,
      password: c.env.DEFAULT_ADMIN_PASS,
      bskyAppPass: c.env.DEFAULT_ADMIN_BSKY_PASS
    }
  });
  return c.html("finished");
})

export default {
  scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(schedulePostTask(env, ctx));
  },

  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};