import fs from "fs/promises";
import type { Hono } from "hono";
import type { ToSSGResult } from "hono/ssg";
import { toSSG } from "hono/ssg";
import { existsSync } from "node:fs";
import path from "node:path";
import * as app from "../src/index";
import { USE_STATIC_HTML } from '../src/limits';
import type { HonoBase } from "../src/types";

type MoveMapRule = {
  file: string;
  destFolder: string;
};

const outputDirectory: string = "./assets/pages";

// list of static files that need to be moved to various locations
// pathed from the outputDirectory
const moveMap: MoveMapRule[] = [
  {file: "consts.js", destFolder: "../js"},
  {file: "atproto-did", destFolder: "../.well-known"},
  {file: "site.webmanifest", destFolder: "../"},
  {file: "robots.txt", destFolder: "../"}
];

async function buildStaticSite(app: Hono<HonoBase>): Promise<void> {
  // If we do not build static html, then do not generate anything.
  if (!USE_STATIC_HTML)
    return;

  // clean up the existing directory if it exists already
  if (existsSync(outputDirectory)) {
    console.log("Removing existing files...");
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
  }


  console.log("\nBuilding SSG app...");
  const response: ToSSGResult = await toSSG(app, fs, {
    dir: outputDirectory,
    extensionMap: {
      "text/html": "html",
      "text/no-ext": "",
      // we want the file to output as .js., so we can bulk program a move map
      "text/javascript": ""
    }
  });
  if (response.success) {
    console.log(`\nBuilt Files:\n${response.files.join("\n")}`);
    console.log("Executing move map...");
    // execute our move map
    for (const mv of moveMap) {
      const moveTo = path.join(outputDirectory, mv.destFolder, mv.file);
      await fs.rename(path.join(outputDirectory, mv.file) + ".", moveTo);
      console.log(`Moved ${mv.file} to ${moveTo}`);
    }
    console.log("\nDone!");
  } else {
    console.error("Encountered error when trying to SSG site");
    console.log(response);
  }
}

await buildStaticSite(app.default.getApp());