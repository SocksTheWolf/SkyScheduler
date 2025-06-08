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
import { Bindings, Post, PostLabel, EmbedData } from "./types.d";
import { MAX_LENGTH, MAX_ALT_TEXT, MIN_LENGTH, FILE_SIZE_LIMIT } from "./limits.d";
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
    content: z.string().url(),
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

  if (!(file instanceof File)) {
    console.warn("Failed to upload", 400);
    return c.json({"success": false, "error": "data invalid"}, 400);
  }

  // The file size limit for R2 without chunking
  if (file.size > FILE_SIZE_LIMIT) {
    return c.json({"success": false, "error": "max file size is 100MB"}, 400);
  }
  
  const fileExt = file.name.split(".").pop();
  const fileName = `${uuidv4()}.${fileExt}`;

  const R2UploadRes = await c.env.R2.put(fileName, await file.arrayBuffer());
  if (R2UploadRes)
    return c.json({"success": true, "data": R2UploadRes.key, "originalName": file.name}, 200);
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
    return c.json({ error: validation.error.format() }, 400);
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

  // TODO: Handle deleting images from R2 first.

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

      const createPost = (data) => {
          const postData: Post = (new Object() as Post);
          postData.embeds = data.embedContent;
          postData.label = data.contentLabel;
          postData.text = data.content;
          return postData;
      }

      scheduledPosts.forEach(async (post) => {
        ctx.waitUntil((async () => {
          const postData = createPost(post);
          await schedulePost(env, postData);
          await db.update(posts).set({ posted: true }).where(eq(posts.id, post.id));
        })());
      });
    };
    ctx.waitUntil(task());
  },

  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};