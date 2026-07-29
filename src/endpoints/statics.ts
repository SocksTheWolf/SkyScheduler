import { Hono } from "hono";
import { every } from "hono/combine";
import { disableSSG } from "hono/ssg";
import isEmpty from "just-is-empty";
import { cacheStaticFileMiddleware } from "../middleware/cacheControl";
import { onlyInDevelopment } from "../middleware/inDevOnly";
import { ATPROTO_DID, SITE_URL } from "../siteInfo";
import { appManifestGenerate } from "../statics/appManifest";
import { makeConstScript } from "../statics/constScript";
import type { HonoBase } from "../types";
import { generateOpenAPI } from "./openapi";

export const staticFiles = new Hono<HonoBase>();

const staticFileMiddleware = every(disableSSG(), cacheStaticFileMiddleware);

staticFiles.get('/openapi.json', onlyInDevelopment, async (c) => {
  return c.json(await generateOpenAPI());
});

// atproto registration route
if (!isEmpty(ATPROTO_DID)) {
  staticFiles.get("/.well-known/atproto-did", staticFileMiddleware,
    (c) => c.text(ATPROTO_DID, 200));
}

// JS injection of const variables
staticFiles.get("/js/consts.js", staticFileMiddleware, (c) => {
  return c.body(makeConstScript(), 200, {'Content-Type': 'text/javascript'});
});

staticFiles.get("/robots.txt", staticFileMiddleware, async (c) => {
  const robotsFile = await (await c.env.ASSETS!.fetch(new URL("https://1.1.1.1/robots.txt"))).text();
  return c.body(`${robotsFile}\n\nSitemap: ${SITE_URL}/sitemap.xml`, 200, {'Content-Type': 'text/plain'});
});

// Write site.webmanifest dynamically
staticFiles.get("/site.webmanifest", staticFileMiddleware, (c) => {
  return c.json(appManifestGenerate());
});

