import { Hono } from "hono";
import { every } from "hono/combine";
import { disableSSG } from "hono/ssg";
import isEmpty from "just-is-empty";
import { ATPROTO_DID, SITE_URL } from "../appInfo";
import { cacheStaticFileMiddleware } from "../middleware/cacheControl";
import { onlyInDevelopment } from "../middleware/inDevOnly";
import { appManifestGenerate } from "../statics/appManifest";
import { makeConstScript } from "../statics/constScript";
import type { HonoBase } from "../types";
import { generateOpenAPI } from "./openapi";

export const staticFiles = new Hono<HonoBase>();

staticFiles.get('/openapi.json', disableSSG(), onlyInDevelopment, async (c) => {
  return c.json(await generateOpenAPI());
});

const staticMiddleware = every(disableSSG(), cacheStaticFileMiddleware);

// atproto registration route
if (!isEmpty(ATPROTO_DID)) {
  staticFiles.get("/.well-known/atproto-did", staticMiddleware, (c) => c.text(ATPROTO_DID, 200));
}

// JS injection of const variables
staticFiles.get("/js/consts.js", staticMiddleware, (c) => {
  return c.body(makeConstScript(), 200, {'Content-Type': 'text/javascript'});
});

staticFiles.get("/robots.txt", staticMiddleware, async (c) => {
  const robotsFile = await (await c.env.ASSETS!.fetch(new URL("https://1.1.1.1/robots.txt"))).text();
  return c.text(`${robotsFile}\n\nSitemap: ${SITE_URL}/sitemap.xml`, 200);
});

// Write site.webmanifest dynamically
staticFiles.get("/site.webmanifest", staticMiddleware, (c) => {
  return c.json(appManifestGenerate());
});

