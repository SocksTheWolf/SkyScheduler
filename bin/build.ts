import fs from "fs/promises";
import type { Hono } from "hono";
import { toSSG, type ToSSGResult } from "hono/ssg";
import path from "node:path";
import * as app from "../src/index";
import { USE_STATIC_HTML } from '../src/limits';
import type { HonoBase } from "../src/types";

async function buildStaticSite(app: Hono<HonoBase>) {
  // If we do not build static html, then do not generate anything.
  if (!USE_STATIC_HTML)
    return;

  const outputDirectory: string = "./assets/pages";
  // Go through the file list in the pages directory,
  // remove everything, but do not get rid of the pages folder.
  for (const file of await fs.readdir(outputDirectory)) {
    const fileLoc: string = path.join(outputDirectory, file);
    // Check if directory
    if (!(await fs.stat(fileLoc)).isDirectory()) {
      // it's a file
      console.log(`Removed ${fileLoc}`);
      await fs.unlink(fileLoc);
    } else {
      // it's a directory
      console.log(`Removed directory ${fileLoc}`);
      await fs.rm(fileLoc, {force: true, recursive: true});
    }
  }

  const response: ToSSGResult = await toSSG(app, fs, {
    dir: outputDirectory
  });
  console.log(response);
  return `Built Files:\n${response.files.join("\n")}`;
}

await buildStaticSite(app.default.getApp());