// there's a lot of bad code in here, and it's not the greatest ngl
// it could be better, probably with less dependency on cat
// and bringing the entire thing within the node architecture
//
// but this only runs in development while building, so not a big deal.
import isEmpty from "just-is-empty";
import { ATPROTO_DID } from "../src/appInfo";
import { PUBLIC_OPENAPI_SPEC, USE_STATIC_HTML } from "../src/config";
import { CaptureType } from "../src/enums";
import { appManifestGenerate } from "../src/statics/appManifest";
import { makeConstScript } from "../src/statics/constScript";
import { redirectRules } from "../src/statics/redirects";
import { generateRobotsTxt } from "../src/statics/robots";
import { debug } from "./helpers/console";
import { lintRuleOutputFile } from "./helpers/lint";
import { buildRunner } from "./helpers/runner";
import { buildSitemap } from "./helpers/sitemap";

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
buildRules.set("build:types:wrangler", {
  buildCommand: `npm run types`,
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
      "bin/configs/siteDepsExports.ts",
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
  // build types
  {
    name: "build wrangler types",
    triggers: [
      "build:types:wrangler",
    ],
    match: ["wrangler.toml", "package.json", "package-lock.json"],
    against: `src/@types/wrangler.d.ts`
  },
];

// Add SSG operations
if (USE_STATIC_HTML) {
  const { buildApp } = await import("./helpers/staticSite");
  debug("adding ssg pages build checks");

  buildRules.set("build:pages", { buildCommand: buildApp });
  buildTriggers.push({
    name: "pages",
    triggers: ["build:pages", "build:sitemap"],
    match: ["src/layout/**",
      "src/pages/*.tsx",
      "bin/configs/sitemapIgnore.ts",
      "bin/configs/siteDepsExports.ts",
      aInfo,
      `${sDir}/*.ts`],
    ignores: [`${sDir}/appManifest.ts`, `${sDir}/robots.ts`, `${sDir}/redirects.ts`],
    against: "assets/pages/index.html",
  });
} else {
  // push the sitemap build rules if we aren't doing ssgs
  buildTriggers.push({
    name: "sitemap",
    triggers: ["build:sitemap"],
    match: ["src/pages/*", "bin/configs/sitemapIgnore.ts"],
    against: "assets/sitemap.xml",
  });
}

if (PUBLIC_OPENAPI_SPEC) {
  const { buildOpenAPISpec } = await import("./openapi");
  buildRules.set("build:openapi", { buildCommand: buildOpenAPISpec });
  buildTriggers.push({
    name: "openapi",
    triggers: ["build:openapi"],
    match: ["src/validation/**", "src/endpoints/openapi.tsx"],
    against: "assets/openapi.json",
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

await buildRunner(buildTriggers, buildRules);