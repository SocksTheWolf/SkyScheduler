import { Context, Env, Hono } from "hono";
import { DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import { verify, sign } from "hono/jwt";
import { z } from "zod";
import { isAfter } from "date-fns";
import { getCookie } from 'hono/cookie';
import { and, eq, lte, desc } from "drizzle-orm";

import { posts } from "./db/schema";
import Home from "./pages/homepage";
import Dashboard from "./pages/dashboard";
import { schedulePost } from "./utils/scheduler";
import { deleteFromR2 } from "./utils/postDelete";
import { Bindings, Post, PostLabel } from "./types.d";
import { MAX_LENGTH, MAX_ALT_TEXT, MIN_LENGTH, R2_FILE_SIZE_LIMIT, BSKY_FILE_SIZE_LIMIT, TO_MB, BSKY_MAX_WIDTH, BSKY_MAX_HEIGHT } from "./limits.d";
import { v4 as uuidv4 } from 'uuid';

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

// Quick function to help out with creating post objects
function createPost(data: any) {
    const postData: Post = (new Object() as Post);
    postData.embeds = data.embedContent;
    postData.label = data.contentLabel;
    postData.text = data.content;
    return postData;
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

// Schema for post creation
const createPostSchema = z.object({
  content: z.string().min(MIN_LENGTH).max(MAX_LENGTH),
  label: z.nativeEnum(PostLabel).optional().default(PostLabel.None),
  embeds: z.object({
    content: z.string(),
    alt: z.string().max(MAX_ALT_TEXT)
  }).array().optional(),
  scheduledDate: z.string().refine((date) => {
    try {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    } catch {
      return false;
    }
  }, "Invalid date format. Please use ISO 8601 format (e.g. 2024-12-14T07:17:05+01:00)"),
});

// Create upload
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
  // If the image is over the file size limit (we will resize the images client side via dropzonejs)
  if (file.size > BSKY_FILE_SIZE_LIMIT) {
    let failedToResize = true;

    if (c.env.USE_IMAGE_TRANSFORMS) {
      const degradePerStep:number = c.env.IMAGE_DEGRADE_PER_STEP;
      var attempts:number = 1;
      do {
        const qualityLevel:number = 100 - degradePerStep*attempts;
        const response = (
          await c.env.IMAGES.input(await file.stream())
            .transform({ quality: qualityLevel, metadata: "copyright" })
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
      return c.json({"success": false, "originalName": originalName, "error": `image is too large for bsky, was ${file.size*TO_MB}MB and could not fit after ${c.env.MAX_IMAGE_QUALITY_STEPS} steps`});
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
  const db: DrizzleD1Database = drizzle(c.env.DB);
  const body = await c.req.json();

  const validation = createPostSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ error: validation.error.toString() }, 400);
  }

  const { content, scheduledDate, embeds, label } = validation.data;
  const scheduleDate = new Date(scheduledDate);

  // Ensure scheduled date is in the future
  if (!isAfter(scheduleDate, new Date())) {
    return c.json({ error: "Scheduled date must be in the future" }, 400);
  }

  await db.insert(posts).values({
    content,
    scheduledDate: scheduleDate,
    embedContent: embeds,
    contentLabel: label
  });

  return c.json({ message: "Post scheduled successfully" });
});

// Get all posts
app.get("/posts", authMiddleware, async (c) => {
  const db: DrizzleD1Database = drizzle(c.env.DB);
  const allPosts = await db.select().from(posts).orderBy(desc(posts.scheduledDate)).all();

  return c.json(allPosts);
});

app.post("/posts/:id/delete", authMiddleware, async (c) => {
  const db: DrizzleD1Database = drizzle(c.env.DB);
  const { id } = c.req.param();

  const postQuery = await db.select().from(posts).where(eq(posts.id, parseInt(id))).all();
  // If the post has not been posted, that means we still have files for it, so
  // delete the files from R2
  if (!postQuery[0].posted)
    await deleteFromR2(c.env, createPost(postQuery[0]).embeds);

  await db.delete(posts).where(eq(posts.id, parseInt(id)));

  return c.redirect("/dashboard?deleted=true");
});

// Root route with login form
app.get("/", (c) => {
  return c.html(<Home />);
});

// Dashboard route
app.get("/dashboard", authMiddleware, (c) => {
  return c.html(
    <Dashboard />
  );
});

export default {
  scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    // Cron Task
    const task = async () => {
      // Get all scheduled posts for current time
      const db: DrizzleD1Database = drizzle(env.DB);
      const currentTime = new Date();
      // round current time to nearest hour
      currentTime.setMinutes(0, 0, 0);

      const scheduledPosts = await db.select().from(posts).where(and(lte(posts.scheduledDate, currentTime), eq(posts.posted, false))).all();

      if (scheduledPosts.length === 0) {
        console.log("No scheduled posts found for current time");
        return
      }

      scheduledPosts.forEach(async (post) => {
        ctx.waitUntil((async () => {
          const postData = createPost(post);
          await schedulePost(env, postData);
          await db.update(posts).set({ posted: true }).where(eq(posts.id, post.id));
          // Delete any embeds if they exist.
          await deleteFromR2(env, postData.embeds);
        })());
      });
    };
    ctx.waitUntil(task());
  },

  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};