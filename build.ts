import fs from 'fs/promises';
import type { Hono } from "hono";
import { toSSG } from "hono/ssg";
import * as app from "./src/index";
import { USE_STATIC_HTML } from './src/limits';
import type { HonoBase } from "./src/types";

// NOTE:
// Static Generation fails to pull in the following flags
// ---------------------
// * IN_DEV

// This makes it so not all pages properly render, which is a huge disappointment.
// We would need a way to inject CF variables/secrets at runtime to potentially
// make this process viable.

async function buildStaticSite(app: Hono<HonoBase>) {
  // If we do not build static html, then do not generate anything.
  if (!USE_STATIC_HTML)
    return;

  const response = await toSSG(app, fs, {
    dir: "./assets/pages"
  });
  console.log(response);
  return `Built Files:\n${response.files.join("\n")}`;
}

await buildStaticSite(app.default.getApp());