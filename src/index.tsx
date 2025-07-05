import { Context, Env, Hono } from "hono";
import { verify, sign } from "hono/jwt";
import { getCookie } from 'hono/cookie';
import Home from "./pages/homepage";
import Dashboard from "./pages/dashboard";
import { schedulePostTask } from "./utils/scheduler";
import { Bindings } from "./types.d";
import { R2_FILE_SIZE_LIMIT, BSKY_FILE_SIZE_LIMIT, TO_MB, BSKY_MAX_WIDTH, BSKY_MAX_HEIGHT } from "./limits.d";
import { v4 as uuidv4 } from 'uuid';
import { createPost, deletePost, getPostsForUser } from "./utils/dbQuery";

const app = new Hono<{ Bindings: Bindings }>();

// Middleware to verify JWT
async function authMiddleware(c: Context, next: any) {
  const token = getCookie(c, 'token');

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    await verify(
      token,
      c.env.JWT_SECRET
    );
    await next();
  } catch (err) {
    return c.json({ error: "Invalid token" }, 401);
  }
}

// Login route
app.post("/login", async (c) => {
  const body = await c.req.json();
  const password = body.password;

  if (password !== c.env.AUTH_PASSWORD) {
    return c.json({ error: "Invalid password" }, 401);
  }

  const payload = {
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // Token expires in 24h
  }

  const token = await sign(payload, c.env.JWT_SECRET, "HS256")

  // Set JWT as an HTTP-only cookie
  c.header("Set-Cookie", `token=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`);
  return c.json({ success: true });
});

app.get("/logout", (c) => {
  c.header("Set-Cookie", `token=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0`);
  return c.redirect("/");
});

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
  const response = await createPost(c.env, body);
  if (!response.ok) {
    return c.json({message: response.msg}, 400);
  }
  return c.json({ message: "Post scheduled successfully" });
});

// Get all posts
app.get("/posts", authMiddleware, async (c) => {
  const allPosts = await getPostsForUser(c.env);
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

export default {
  scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(schedulePostTask(env, ctx));
  },

  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};