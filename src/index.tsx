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
import { Bindings } from "./types";

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
  content: z.string().min(1).max(300),
  scheduledDate: z.string().refine((date) => {
    try {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    } catch {
      return false;
    }
  }, "Invalid date format. Please use ISO 8601 format (e.g. 2024-12-14T07:17:05+01:00)"),
});

// Create post
app.post("/posts", authMiddleware, async (c) => {
  const db: DrizzleD1Database = drizzle(c.env.DB);
  const body = await c.req.json();

  const validation = createPostSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ error: validation.error.format() }, 400);
  }

  const { content, scheduledDate } = validation.data;
  const scheduleDate = new Date(scheduledDate);

  // Ensure scheduled date is in the future
  if (!isAfter(scheduleDate, new Date())) {
    return c.json({ error: "Scheduled date must be in the future" }, 400);
  }

  await db.insert(posts).values({
    content,
    scheduledDate: scheduleDate,
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
          await schedulePost(env, post.content)
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