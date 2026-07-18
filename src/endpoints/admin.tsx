import { Hono } from "hono";
import { authAdminOnlyMiddleware } from "../middleware/adminOnly";
import type { HonoBase } from "../types";
import { getAllAbandonedMedia } from "../utils/db/file";
import { runMaintenanceUpdates } from "../utils/db/maintain";
import { cleanupAbandonedFiles, cleanUpPostsTask, schedulePostTask } from "../utils/scheduler";

export const admin = new Hono<HonoBase>();
admin.use(authAdminOnlyMiddleware);

// Admin Maintenance Cleanup
admin.get("/cron", async (c) => {
  await schedulePostTask(c);
  return c.text("ran");
});

admin.get("/cron-clean", (c) => {
  c.executionCtx.waitUntil(cleanUpPostsTask(c));
  return c.text("ran");
});

admin.get("/db-update", (c) => {
  c.executionCtx.waitUntil(runMaintenanceUpdates(c));
  return c.text("ran");
});

admin.get("/abandoned", async (c) => {
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