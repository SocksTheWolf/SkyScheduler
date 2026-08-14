import { existsSync } from "fs";
import fs from "fs/promises";
import type { Hono } from "hono";
import { type ToSSGResult, toSSG } from "hono/ssg";
import path from "path";
import * as app from "../../src/index";
import { USE_STATIC_HTML } from "../../src/limits";
import type { HonoBase } from "../../src/types";
import { debug, error, log } from "./console";

async function buildStaticSite(app: Hono<HonoBase>, moveMap?: MoveMapRule[]): Promise<void> {
  const outputDirectory: string = "./assets/pages";
  // If we do not build static html, then do not generate anything.
  if (!USE_STATIC_HTML)
    return;

  // clean up the existing directory if it exists already
  if (existsSync(outputDirectory)) {
    debug("Removing existing files...");
    // Go through the file list in the pages directory,
    // remove everything, but do not get rid of the pages folder.
    for (const file of await fs.readdir(outputDirectory)) {
      const fileLoc: string = path.join(outputDirectory, file);
      // Check if directory
      if (!(await fs.stat(fileLoc)).isDirectory()) {
        // it's a file
        debug(`Removed ${fileLoc}`);
        await fs.unlink(fileLoc);
      } else {
        // it's a directory
        debug(`Removed directory ${fileLoc}`);
        await fs.rm(fileLoc, { force: true, recursive: true });
      }
    }
  }

  debug("\nBuilding SSG app...");
  const response: ToSSGResult = await toSSG(app, fs, {
    dir: outputDirectory,
    extensionMap: {
      "text/html": "html",
      "text/no-ext": "",
      // we want the file to output as .js., so we can bulk program a move map
      "text/javascript": "",
    },
  });
  if (response.success) {
    log(`\nBuilt Static Files:\n${response.files.join("\n")}`);
    if (moveMap !== undefined) {
      debug("Executing move map...");
      // execute our move map
      for (const mv of moveMap) {
        const moveTo = path.join(outputDirectory, mv.destFolder, mv.file);
        await fs.rename(path.join(outputDirectory, mv.file) + ".", moveTo);
        debug(`Moved ${mv.file} to ${moveTo}`);
      }
    }
    log("\nDone!");
  } else {
    error(`Encountered error when trying to SSG site ${response}`);
  }
}

export async function buildApp(moveMap?: MoveMapRule[]) {
  await buildStaticSite(app.default.getApp(), moveMap);
}