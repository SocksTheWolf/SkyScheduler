import fs from 'fs/promises';
import type { Hono } from "hono";
import { toSSG } from "hono/ssg";
import * as app from "./src/index";
import { USE_STATIC_HTML } from './src/limits';
import type { HonoBase } from "./src/types";

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