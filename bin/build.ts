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
import { USE_STATIC_HTML } from "../src/config";
import { CaptureType } from "../src/enums";
import { appManifestGenerate } from "../src/statics/appManifest";
import { makeConstScript } from "../src/statics/constScript";
import { redirectRules } from "../src/statics/redirects";
import { generateRobotsTxt } from "../src/statics/robots";
import { minifyOptions } from "./configs/minifyOptions";
import { debug, error, log, warn } from "./helpers/console";
import { generateLintRules, lintRuleOutputFile } from "./helpers/lint";
import { buildSitemap } from "./helpers/sitemap";
import { buildApp } from "./helpers/staticSite";
import { runCommandAsync } from "./helpers/subCommand";

// Easy path swaps
const sDir: string = "src/statics";
const aInfo: string = "src/appInfo.ts";
const aJS: string = "assets/js";
const aCSS: string = "assets/css";

// All the various build rules
const buildRules = new Map<string, BuildRule>();
buildRules.set("build:js:main", {
  buildCommand: `cat ${aJS}/main.js`,
  output: `${aJS}/min/main.min.js`,
  minify: true,
});
buildRules.set("build:js:app", {
  buildCommand: `cat ${aJS}/*Helper.js`,
  output: `${aJS}/min/app.min.js`,
  minify: true,
});
buildRules.set("build:css:style", {
  buildCommand: `cat ${aCSS}/stylesheet.css`,
  output: `${aCSS}/stylesheet.min.css`,
  minify: true,
});
buildRules.set("build:css:dash", {
  buildCommand: `cat ${aCSS}/dashboard.css`,
  output: `${aCSS}/dashboard.min.css`,
  minify: true,
});
buildRules.set("build:css:mods", {
  buildCommand: `cat ${aCSS}/*Mods.css`,
  output: `${aCSS}/depmods.min.css`,
  minify: true,
});
buildRules.set("lint:consts", {
  buildCommand: `cat ${aJS}/consts.js`,
  captures: CaptureType.CONSTS,
});
buildRules.set("lint:all_funcs", {
  buildCommand: `cat ${aJS}/*.js`,
  captures: CaptureType.FUNCS,
});
buildRules.set("lint:selectHelper", {
  buildCommand: `cat ${aJS}/appSelectHelper.js`,
  captures: CaptureType.CONSTS,
});
buildRules.set("build:consts", {
  buildCommand: makeConstScript,
  output: `${aJS}/consts.js`,
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
buildRules.set("build:redirects", {
  buildCommand: redirectRules,
  output: "assets/_redirects"
});

// This rule set is used in two different places, so cache it out for maintaining both rules easily.
const constScriptMatches = [`${sDir}/constScript.ts`, "src/limits.ts", "src/config.ts"];

// The things that trigger off builds if the rules are a match
const buildTriggers: BuildTrigger[] = [
  // build app script
  {
    name: "build js app scripts",
    triggers: ["build:js:app"],
    match: [`${aJS}/*Helper.js`, `${sDir}/appScripts.ts`],
    against: `${aJS}/min/app.min.js`,
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
    match: constScriptMatches,
    against: `${aJS}/consts.js`,
  },
  // build main
  {
    name: "build js main",
    triggers: ["build:js:main"],
    match: [`${aJS}/main.js`, `${sDir}/appScripts.ts`],
    against: `${aJS}/min/main.min.js`,
  },
  // stylesheets
  {
    name: "build css stylesheet",
    triggers: ["build:css:style"],
    match: [`${aCSS}/stylesheet.css`, `${sDir}/appStyles.ts`],
    against: `${aCSS}/stylesheet.min.css`,
  },
  {
    name: "build css dashboard",
    triggers: ["build:css:dash"],
    match: [`${aCSS}/dashboard.css`, `${sDir}/appStyles.ts`],
    against: `${aCSS}/dashboard.min.css`,
  },
  {
    name: "build css mods",
    triggers: ["build:css:mods"],
    match: [`${aCSS}/*Mods.css`, `${sDir}/appStyles.ts`],
    against: `${aCSS}/depmods.min.css`,
  },
  // lint web scripts
  {
    name: "lint",
    triggers: ["lint:consts", "lint:all_funcs", "lint:selectHelper"],
    match: [
      `${aJS}/*.js`,
      `${sDir}/appScripts.ts`,
      ...constScriptMatches
    ],
    ignores: [`${aJS}/consts.js`],
    against: lintRuleOutputFile,
  },
  // static files
  {
    name: "robots",
    triggers: ["build:robots"],
    match: [`${sDir}/robots.ts`, aInfo],
    against: "assets/robots.txt",
  },
  {
    name: "manifest",
    triggers: ["build:appmanifest"],
    match: [`${sDir}/appManifest.ts`, aInfo],
    against: "assets/site.webmanifest",
  },
  {
    name: "redirects",
    triggers: ["build:redirects"],
    match: [`${sDir}/redirects.ts`, aInfo],
    against: "assets/_redirects",
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
    match: ["src/layout/**",
      "src/pages/*.tsx",
      aInfo,
      `${sDir}/*.ts`],
    ignores: [`${sDir}/appManifest.ts`, `${sDir}/robots.ts`, `${sDir}/redirects.ts`],
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
    match: [aInfo],
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
    debug(`Match: Adding "${trigger.name}" build commands: "${trigger.triggers.join(", ")}"`);
    buildCommands.push(...trigger.triggers);
  };

  // Check to see if we need to build
  for (const trigger of buildTriggers) {
    debug(`Checking "${trigger.name}" for matches via ${trigger.match.join(",")}`);
    let compareAgainst: number;

    // Check if the comparison file exists, if it doesn't, make the file.
    if (!existsSync(trigger.against)) {
      debug(`${trigger.name} - against file is missing ${trigger.against}, building`);
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

  // Do not print anything if we do not have any build commands at all.
  if (buildCommands.length > 0) {
    log(`\nRunning Build Rules: ${buildCommands.join(", ")}\n`);
  } else {
    log("No Build Necessary");
    return;
  }

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
        if (rule.output === undefined)
          return;

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
