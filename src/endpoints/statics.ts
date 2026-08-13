import { Hono } from "hono";
import { every, except } from "hono/combine";
import { disableSSG } from "hono/ssg";
import isEmpty from "just-is-empty";
import { ATPROTO_DID } from "../appInfo";
import { USE_STATIC_HTML } from "../limits";
import { cacheStaticFileMiddleware } from "../middleware/cacheControl";
import { onlyInDevelopment } from "../middleware/inDevOnly";
import { appManifestGenerate } from "../statics/appManifest";
import { makeConstScript } from "../statics/constScript";
import { generateRobotsTxt } from "../statics/robots";
import type { HonoBase } from "../types";
import { generateOpenAPI } from "./openapi";

export const staticFiles = new Hono<HonoBase>();

staticFiles.get("/openapi.json", disableSSG(), onlyInDevelopment, async (c) => {
  return c.json(await generateOpenAPI());
});

const staticMiddleware = every(disableSSG(), cacheStaticFileMiddleware);
const runMiddlewareUnlessStatic = except(() => USE_STATIC_HTML, staticMiddleware);

// atproto registration route
if (!isEmpty(ATPROTO_DID)) {
  staticFiles.get(USE_STATIC_HTML ? "/atproto-did" : "/.well-known/atproto-did", runMiddlewareUnlessStatic, (c) =>
    c.body(ATPROTO_DID, 200, { "Content-Type": USE_STATIC_HTML ? "text/no-ext" : "text/plain" })
  );
}

// JS injection of const variables
staticFiles.get(USE_STATIC_HTML ? "/consts.js" : "/js/consts.js", runMiddlewareUnlessStatic, (c) => {
  return c.body(makeConstScript(), 200, { "Content-Type": "text/javascript" });
});

// We have to not overwrite robots.txt as that is already in the assets directory
// so make sure to serve that one dynamically.
staticFiles.get("/robots.txt", runMiddlewareUnlessStatic, (c) => {
  return c.body(generateRobotsTxt(), 200, { "Content-Type": USE_STATIC_HTML ? "text/no-ext" : "text/plain" });
});

// Write site.webmanifest dynamically
staticFiles.get("/site.webmanifest", runMiddlewareUnlessStatic, (c) => {
  return c.body(JSON.stringify(appManifestGenerate()), 200, {
    "Content-Type": USE_STATIC_HTML ? "text/no-ext" : "application/json",
  });
});
