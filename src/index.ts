import { Env, Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
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
