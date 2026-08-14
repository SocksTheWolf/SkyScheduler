import { existsSync } from "fs";
import fs, { readdir, rm, stat, unlink } from "fs/promises";
import type { Hono } from "hono";
import type { ToSSGResult } from "hono/ssg";
import { toSSG } from "hono/ssg";
import path from "path";
import { USE_STATIC_HTML } from "../../src/config";
import * as app from "../../src/index";
import type { HonoBase } from "../../src/types";
import { debug, error, log } from "./console";

async function buildStaticSite(app: Hono<HonoBase>): Promise<void> {
  const outputDirectory: string = "./assets/pages";
  // If we do not build static html, then do not generate anything.
  if (!USE_STATIC_HTML)
    return;

  // clean up the existing directory if it exists already
  if (existsSync(outputDirectory)) {
    debug("Removing existing files...");
    // Go through the file list in the pages directory,
    // remove everything, but do not get rid of the pages folder.
    for (const file of await readdir(outputDirectory)) {
      const fileLoc: string = path.join(outputDirectory, file);
      // Check if directory
      if (!(await stat(fileLoc)).isDirectory()) {
        // it's a file
        debug(`Removed ${fileLoc}`);
        await unlink(fileLoc);
      } else {
        // it's a directory
        debug(`Removed directory ${fileLoc}`);
        await rm(fileLoc, { force: true, recursive: true });
      }
    }
  }

  debug("\nBuilding SSG app...");
  const response: ToSSGResult = await toSSG(app, fs, {
    dir: outputDirectory,
    extensionMap: {
      "text/html": "html"
    },
  });
  if (response.success) {
    log(`\nBuilt Static Files:\n${response.files.join("\n")}`);
  } else {
    error(`Encountered error when trying to SSG site ${response}`);
  }
}

export async function buildApp() {
  await buildStaticSite(app.default.getApp());
}