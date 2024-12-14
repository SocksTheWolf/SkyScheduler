import { Context, Env, Hono } from "hono";
import { DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import { posts } from "./db/schema";
import { verify, sign } from "hono/jwt";
import { z } from "zod";
import { isAfter } from "date-fns";
import { getCookie } from 'hono/cookie';
import { BaseLayout } from "./layout";
import { html } from 'hono/html';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  AUTH_PASSWORD: string;
};

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

  const token = sign(payload, c.env.JWT_SECRET, "HS256")

  // Set JWT as an HTTP-only cookie
  c.header("Set-Cookie", `token=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`);
  return c.json({ success: true });
});

// Schema for post creation
const createPostSchema = z.object({
  content: z.string().min(1),
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
  const allPosts = await db.select().from(posts).all();
  return c.json(allPosts);
});

// Root route with login form
app.get("/", (c) => {
  return c.html(
    <BaseLayout title="Login - Social Media Scheduler">

      <div class="flex items-center justify-center min-h-screen">
        <div class="bg-white p-8 rounded-lg shadow-md w-96">
          <h1 class="text-2xl font-bold mb-6 text-center">Login</h1>
          <form id="loginForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Password</label>
              <input type="password" id="password" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required />
            </div>
            <button type="submit" class="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Login
            </button>
          </form>
          <div id="error" class="mt-4 text-red-500 text-sm hidden"></div>
        </div>
      </div>
      <script>
        {html`
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
        const password = document.getElementById('password').value;
        try {
            const response = await fetch('/login', {
          method: 'POST',
        headers: {'Content-Type': 'application/json' },
        body: JSON.stringify({password})
            });
        const data = await response.json();
        if (response.ok) {
          window.location.href = '/dashboard';
            } else {
          document.getElementById('error').textContent = data.error;
        document.getElementById('error').classList.remove('hidden');
            }
          } catch (err) {
          document.getElementById('error').textContent = 'An error occurred';
        document.getElementById('error').classList.remove('hidden');
          }
        });
        `}
      </script>
    </BaseLayout>

  );
});

// Dashboard route
app.get("/dashboard", authMiddleware, (c) => {
  return c.html(
    <BaseLayout title="Dashboard - Social Media Scheduler">
      <div class="container mx-auto px-4 py-8">
        <div class="max-w-4xl mx-auto">
          <div class="bg-white rounded-lg shadow-md p-6 mb-8">
            <h1 class="text-2xl font-bold mb-6">Schedule New Post</h1>
            <form id="postForm" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Content</label>
                <textarea id="content" rows={4} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Schedule Date</label>
                <input type="datetime-local" id="scheduledDate" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required />
              </div>
              <button type="submit" class="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                Schedule Post
              </button>
            </form>
            <div id="error" class="mt-4 text-red-500 text-sm hidden"></div>
            <div id="success" class="mt-4 text-green-500 text-sm hidden"></div>
          </div>

          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold mb-6">Scheduled Posts</h2>
            <div id="posts" class="space-y-4"></div>
          </div>
        </div>
      </div>

      <script>
        {html`
        // Format date for display
        function formatDate(date) {
          return new Date(date).toLocaleString();
        }

        // Load posts
        async function loadPosts() {
          const response = await fetch('/posts');
        const posts = await response.json();
        const postsContainer = document.getElementById('posts');
          postsContainer.innerHTML = posts.map(post => \`
        <div class="border-b border-gray-200 pb-4">
          <p class="text-gray-800">\${post.content}</p>
          <p class="text-sm text-gray-500 mt-2">Scheduled for: \${formatDate(post.scheduledDate)}</p>
        </div>
        \`).join('');
        }

        // Load posts on page load
        loadPosts();

        // Handle form submission
        document.getElementById('postForm').addEventListener('submit', async (e) => {
          e.preventDefault();
        const content = document.getElementById('content').value;
        const scheduledDate = document.getElementById('scheduledDate').value;

        try {
            const response = await fetch('/posts', {
          method: 'POST',
        headers: {'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          scheduledDate: new Date(scheduledDate).toISOString()
              })
            });
        const data = await response.json();

        if (response.ok) {
          document.getElementById('success').textContent = 'Post scheduled successfully';
        document.getElementById('success').classList.remove('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('postForm').reset();
        loadPosts();
            } else {
          document.getElementById('error').textContent = data.error?.message || data.error || 'An error occurred';
        document.getElementById('error').classList.remove('hidden');
        document.getElementById('success').classList.add('hidden');
            }
          } catch (err) {
          document.getElementById('error').textContent = 'An error occurred';
        document.getElementById('error').classList.remove('hidden');
        document.getElementById('success').classList.add('hidden');
          }
        });
        `}
      </script>
    </BaseLayout>
  );
});

export default {
  scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const task = async () => {
      // Cron Task
    };
    ctx.waitUntil(task());
  },

  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};