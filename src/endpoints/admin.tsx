import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { ContextVariables } from "../auth";
import { authAdminOnlyMiddleware } from "../middleware/adminOnly";
import { Bindings } from "../types.d";
import { getAllAbandonedMedia } from "../utils/db/file";
import { runMaintenanceUpdates } from "../utils/db/maintain";
import { makeInviteKey } from "../utils/inviteKeys";
import { corsHelperMiddleware } from "../middleware/corsHelper";
import { cleanupAbandonedFiles, cleanUpPostsTask, schedulePostTask } from "../utils/scheduler";

export const admin = new Hono<{ Bindings: Bindings, Variables: ContextVariables }>();

admin.use(secureHeaders());
admin.use(corsHelperMiddleware);

// Generate invites route
admin.get("/invite", authAdminOnlyMiddleware, (c) => {
  const newKey = makeInviteKey(c);
  if (newKey !== null)
    return c.text(`${newKey} is good for ${c.env.SIGNUP_SETTINGS.invite_uses} uses`);
  else
    return c.text("Invite keys are disabled.");
});

// Admin Maintenance Cleanup
admin.get("/cron", authAdminOnlyMiddleware, async (c) => {
  await schedulePostTask(c);
  return c.text("ran");
});

admin.get("/cron-clean", authAdminOnlyMiddleware, (c) => {
  c.executionCtx.waitUntil(cleanUpPostsTask(c));
  return c.text("ran");
});

admin.get("/db-update", authAdminOnlyMiddleware, (c) => {
  c.executionCtx.waitUntil(runMaintenanceUpdates(c));
  return c.text("ran");
});

admin.get("/abandoned", authAdminOnlyMiddleware, async (c) => {
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
