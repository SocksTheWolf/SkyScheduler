// there's a lot of bad code in here, and it's not the greatest ngl
// it could be better, probably with less dependency on cat
// and bringing the entire thing within the node architecture
//
// but this only runs in development while building, so not a big deal.
import isEmpty from "just-is-empty";
import unique from "just-unique";
import { minify } from "minify";
import { existsSync, statSync } from "node:fs";
import { glob, mkdir, writeFile } from "node:fs/promises";
import { ATPROTO_DID } from "../src/appInfo";
import { USE_STATIC_HTML } from "../src/limits";
import { appManifestGenerate } from "../src/statics/appManifest";
import { makeConstScript } from "../src/statics/constScript";
import { generateRobotsTxt } from "../src/statics/robots";
import { minifyOptions } from "./configs/minifyOptions";
import { debug, error, log, warn } from "./helpers/console";
import { generateLintRules, lintRuleOutputFile } from "./helpers/lint";
import { buildSitemap } from "./helpers/sitemap";
import { buildApp } from "./helpers/staticSite";
import { runCommandAsync } from "./helpers/subCommand";
import { CaptureType } from "./types";

// All the various build rules
const buildRules = new Map<string, BuildRule>();
buildRules.set("build:js:main", {
  buildCommand: "cat assets/js/main.js",
  output: "assets/js/min/main.min.js",
  minify: true,
});
buildRules.set("build:js:app", {
  buildCommand: "cat assets/js/*Helper.js",
  output: "assets/js/min/app.min.js",
  minify: true,
});
buildRules.set("build:css:style", {
  buildCommand: "cat assets/css/stylesheet.css",
  output: "assets/css/stylesheet.min.css",
  minify: true,
});
buildRules.set("build:css:dash", {
  buildCommand: "cat assets/css/dashboard.css",
  output: "assets/css/dashboard.min.css",
  minify: true,
});
buildRules.set("build:css:mods", {
  buildCommand: "cat assets/css/*Mods.css",
  output: "assets/css/depmods.min.css",
  minify: true,
});
buildRules.set("lint:consts", {
  buildCommand: "cat assets/js/consts.js",
  captures: CaptureType.CONSTS,
});
buildRules.set("lint:all_funcs", {
  buildCommand: "cat assets/js/*.js",
  captures: CaptureType.FUNCS,
});
buildRules.set("lint:selectHelper", {
  buildCommand: "cat assets/js/appSelectHelper.js",
  captures: CaptureType.CONSTS,
});
buildRules.set("build:consts", {
  buildCommand: makeConstScript,
  output: "assets/js/consts.js",
});
buildRules.set("build:appmanifest", {
  buildCommand: appManifestGenerate,
  output: "assets/site.webmanifest",
});
buildRules.set("build:robots", {
  buildCommand: generateRobotsTxt,
  output: "assets/robots.txt",
});
buildRules.set("build:sitemap", {
  buildCommand: buildSitemap,
  output: "assets/sitemap.xml"
});

// The things that trigger off builds if the rules are a match
const buildTriggers: BuildTrigger[] = [
  // build app script
  {
    name: "build js app scripts",
    triggers: ["build:js:app"],
    match: ["assets/js/*Helper.js", "src/statics/appScripts.ts"],
    against: "assets/js/min/app.min.js",
  },
  // build const and lints
  {
    name: "build const script",
    triggers: [
      "build:consts",
      "lint:consts",
      "lint:all_funcs",
      "lint:selectHelper",
    ],
    match: ["src/statics/constScript.ts", "src/limits.ts"],
    against: "assets/js/consts.js",
  },
  // build main
  {
    name: "build js main",
    triggers: ["build:js:main"],
    match: ["assets/js/main.js", "src/statics/appScripts.ts"],
    against: "assets/js/min/main.min.js",
  },
  // stylesheets
  {
    name: "build css stylesheet",
    triggers: ["build:css:style"],
    match: ["assets/css/stylesheet.css"],
    against: "assets/css/stylesheet.min.css",
  },
  {
    name: "build css dashboard",
    triggers: ["build:css:dash"],
    match: ["assets/css/dashboard.css"],
    against: "assets/css/dashboard.min.css",
  },
  {
    name: "build css mods",
    triggers: ["build:css:mods"],
    match: ["assets/css/*Mods.css"],
    against: "assets/css/depmods.min.css",
  },
  // lint web scripts
  {
    name: "lint",
    triggers: ["lint:consts", "lint:all_funcs", "lint:selectHelper"],
    match: [
      "assets/js/*.js",
      "src/statics/appScripts.ts",
      "src/statics/constScript.ts",
    ],
    ignores: ["assets/js/consts.js"],
    against: lintRuleOutputFile,
  },
  // static files
  {
    name: "robots",
    triggers: ["build:robots"],
    match: ["src/statics/robots.ts", "src/appInfo.ts"],
    against: "assets/robots.txt",
  },
  {
    name: "manifest",
    triggers: ["build:appmanifest"],
    match: ["src/statics/appManifest.ts", "src/appInfo.ts"],
    against: "assets/site.webmanifest",
  },
  {
    name: "sitemap",
    triggers: ["build:sitemap"],
    match: ["src/pages/*"],
    against: "assets/sitemap.xml",
  },
];

// Add SSG operations
if (USE_STATIC_HTML) {
  debug("adding ssg pages build checks");

  buildRules.set("build:pages", { buildCommand: buildApp });
  buildTriggers.push({
    name: "pages",
    triggers: ["build:pages", "build:sitemap"],
    match: ["src/layout/**", "src/pages/*.tsx", "src/appInfo.ts"],
    against: "assets/pages/index.html",
  });
}

// Add the atproto output if the setting is set
if (!isEmpty(ATPROTO_DID)) {
  debug("adding atproto build checks");

  buildRules.set("build:proto", {
    buildCommand: () => ATPROTO_DID,
    output: "assets/.well-known/atproto-did",
  });
  buildTriggers.push({
    name: "proto",
    triggers: ["build:proto"],
    match: ["src/appInfo.ts"],
    against: "assets/.well-known/atproto-did",
  });
}

async function main() {
  const fileModMap = new Map<string, number>();
  const canMakeLint: boolean = (process.env["NO_LINT"] !== "true");
  let buildCommands: string[] = [];

  // create the js output directory if it doesn't exist
  if (!existsSync("assets/js/min")) {
    await mkdir("assets/js/min");
  }

  const addBuildCommands = (trigger: BuildTrigger) => {
    debug(
      `Match: Adding "${trigger.name}" build commands: "${trigger.triggers.join(", ")}"`,
    );
    buildCommands.push(...trigger.triggers);
  };

  // Check to see if we need to build
  for (const trigger of buildTriggers) {
    debug(`Checking "${trigger.name}" for matches`);
    let compareAgainst: number;

    // Check if the comparison file exists, if it doesn't, make the file.
    if (!existsSync(trigger.against)) {
      addBuildCommands(trigger);
      continue;
    }

    // get the modtime of the against and cache it.
    if (!fileModMap.has(trigger.against)) {
      compareAgainst = statSync(trigger.against).mtimeMs;
      fileModMap.set(trigger.against, compareAgainst);
    } else {
      compareAgainst = fileModMap.get(trigger.against)!;
    }

    for await (const matchedFile of glob(trigger.match, {exclude: trigger.ignores})) {
      if (compareAgainst < statSync(matchedFile).mtimeMs) {
        addBuildCommands(trigger);
        break;
      }
    }
  }

  // make sure that buildCommands only contains uniques
  buildCommands = unique(buildCommands);

  if (buildCommands.length > 0)
    log(`\nRunning Build Rules: ${buildCommands.join(",")}\n`);

  // build anything that exists.
  let lintCommands: BuildRule[] = [];
  for (const command of buildCommands) {
    const rule: BuildRule | undefined = buildRules.get(command);
    if (rule === undefined) {
      warn(`${command} - invalid build command was specified`);
      continue;
    }

    // We handle lints later
    if (rule.captures !== undefined) {
      if (canMakeLint)
        lintCommands.push(rule);
      continue;
    }

    if (typeof rule.buildCommand === "string") {
      runCommandAsync(rule.buildCommand, async (output: string) => {
        debug(`${command} - executed build command ${rule.buildCommand}`);
        if (rule.output === undefined) return;

        if (rule.minify) {
          try {
            // @ts-ignore
            const data = await minify.auto(output, minifyOptions);
            await writeFile(rule.output, data);
          } catch (err) {
            error(`${command} - Got error: ${err}`);
          }
        } else {
          await writeFile(rule.output, output);
        }
      });
    } else {
      const output: string | void = await rule.buildCommand();
      debug(`${command} - Was ran`);
      if (typeof output === "string" && rule.output !== undefined) {
        await writeFile(rule.output, output);
        debug(`${command} - Wrote file ${rule.output}`);
      }
    }
  }

  // Generate any lints that are necessary
  if (lintCommands.length > 0) {
    log("building lint configs");
    await generateLintRules(lintCommands);
  }
}

await main();
