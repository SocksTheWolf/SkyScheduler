import { Hono } from "hono";
import { generateSpecs } from "hono-openapi";
import { secureHeaders } from "hono/secure-headers";
import { ContextVariables } from "../auth";
import { authAdminOnlyMiddleware } from "../middleware/adminOnly";
import { corsHelperMiddleware } from "../middleware/corsHelper";
import { APP_NAME, SITE_URL } from "../siteinfo";
import { Bindings } from "../types.d";
import { getAllAbandonedMedia } from "../utils/db/file";
import { runMaintenanceUpdates } from "../utils/db/maintain";
import { makeInviteKey } from "../utils/inviteKeys";
import { cleanupAbandonedFiles, cleanUpPostsTask, schedulePostTask } from "../utils/scheduler";
import { openapiRoutes } from "./openapi";

export const admin = new Hono<{ Bindings: Bindings, Variables: ContextVariables }>();

admin.use(secureHeaders());
admin.use(corsHelperMiddleware);
admin.use(authAdminOnlyMiddleware);

// Generate invites route
admin.get("/invite", (c) => {
  const newKey = makeInviteKey(c);
  if (newKey !== null)
    return c.text(`${newKey} is good for ${c.env.SIGNUP_SETTINGS.invite_uses} uses`);
  else
    return c.text("Invite keys are disabled.");
});

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

////// OpenAPI Spec for WAF /////
admin.get('/openapi.json', async (c) => {
  const specs = await generateSpecs(openapiRoutes, {
    documentation: {
      info: {
        title: `${APP_NAME} API Routes`,
        version: '1.0.0',
        description: 'API Routes',
        termsOfService: `${SITE_URL}/tos`,
        license: {
          name: "MIT",
        }
      },
      openapi: "3.0",
      servers: [
        { url: SITE_URL, description: 'Production Server'}
      ],
    },
  }, c);
  return c.json(specs);
});