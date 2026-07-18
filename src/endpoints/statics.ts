import { Hono } from "hono";
import { cache } from "hono/cache";
import { every } from "hono/combine";
import { disableSSG } from "hono/ssg";
import isEmpty from "just-is-empty";
import { onlyInDevelopment } from "../middleware/inDevOnly";
import { ATPROTO_DID } from "../siteinfo";
import { appManifestGenerate } from "../statics/appManifest";
import { makeConstScript } from "../statics/constScript";
import { robotsGenerate } from "../statics/robotsGenerator";
import type { HonoBase } from "../types";
import { generateOpenAPI } from "./openapi";

export const staticFiles = new Hono<HonoBase>();

const staticFileMiddleware = every(disableSSG(), cache({ cacheName: 'statics',
  cacheControl: 'max-age=604800, must-revalidate, proxy-revalidate' }));

staticFiles.get('/openapi.json', onlyInDevelopment, async (c) => {
  return c.json(await generateOpenAPI(c));
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

// Write the robots.txt file dynamically
staticFiles.get("/robots.txt", staticFileMiddleware, async (c) => {
  return c.text(robotsGenerate(), 200);
});

// Write site.webmanifest dynamically
staticFiles.get("/site.webmanifest", staticFileMiddleware, (c) => {
  return c.json(appManifestGenerate());
});

