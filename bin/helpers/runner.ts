import unique from "just-unique";
import { minify } from "minify";
import { existsSync, statSync } from "node:fs";
import { glob, mkdir, writeFile } from "node:fs/promises";
import { minifyOptions } from "../configs/minifyOptions";
import { debug, error, log, warn } from "./console";
import { generateLintRules } from "./lint";
import { runCommandAsync } from "./subCommand";

export async function buildRunner(buildTriggers: BuildTriggers, buildRules: BuildRules) {
  // prevent multiple re-entry operations.
  if (process.env.IS_BUILDING !== undefined) {
    debug("recursive re-entry detected, stopping...");
    return;
  }

  const fileModMap = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/dot-notation
  const canMakeLint: boolean = (process.env["NO_LINT"] !== "true");
  let buildCommands: string[] = [];

  // set that we are currently building
  process.env.IS_BUILDING = "true";

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
  const lintCommands: BuildRule[] = [];
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

    // if this build type is of an exec string
    if (typeof rule.buildCommand === "string") {
      const callback = async (output: string) => {
        debug(`${command} - executed build command ${rule.buildCommand.toString()}`);
        if (rule.output === undefined)
          return;

        if (rule.minify) {
          try {
            // @ts-ignore - the types are invalid for the options object, this can be verified by looking at the minify code.
            const data: string = (rule.output.includes(".js")) ? await minify.js(output, minifyOptions) : await minify.css(output);
            await writeFile(rule.output, data);
          } catch (err: unknown) {
            error(`${command} - Got error: ` + String(err));
          }
        } else {
          await writeFile(rule.output, output);
        }
      };
      await runCommandAsync(rule.buildCommand, callback);
    } else {
      const output: BuildRuleFuncOutput = await rule.buildCommand();
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
  log("Completed build");
}
