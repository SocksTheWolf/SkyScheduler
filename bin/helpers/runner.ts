import unique from "just-unique";
import { minify } from "minify";
import { existsSync, statSync } from "node:fs";
import { glob, mkdir, writeFile } from "node:fs/promises";
import { minifyOptions } from "../configs/minifyOptions";
import { debug, error, lineBreak, log, warn } from "./console";
import { generateLintRules } from "./lint";
import { runCommandAsync } from "./subCommand";

export async function buildRunner(options: BuildRunnerOptions) {
  // prevent multiple re-entry operations.
  if (process.env.IS_BUILDING !== undefined) {
    debug("recursive re-entry detected, stopping...");
    return;
  }

  lineBreak();
  const fileModMap = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/dot-notation
  const canMakeLint: boolean = (process.env["NO_LINT"] !== "true");
  let buildCommands: string[] = [];

  // set that we are currently building
  process.env.IS_BUILDING = "true";

  // handle any commandline flags
  if (process.argv.length > 2) {
    process.argv.forEach((cmd) => {
      if (cmd.includes("--build=")) {
        const command = cmd.replace("--build=", "");
        log(`Adding build rule "${command}"`);
        buildCommands.push(command);
      }
      else if (cmd.includes("--cmd=") && options.commands !== undefined) {
        const commandStr: string = cmd.replace("--cmd=", "");
        const command: BuildCmds|undefined = options.commands.get(commandStr);
        if (command !== undefined) {
          buildCommands.push(...command.actions);
          log(`Added build command "${commandStr}"`);
        }
      }
    });
  }

  // create the js output directory if it doesn't exist
  if (!existsSync("assets/js/min")) {
    await mkdir("assets/js/min");
  }

  const addBuildCommands = (trigger: BuildTrigger) => {
    debug(`Match: Adding "${trigger.name}" build commands: "${trigger.triggers.join(", ")}"`);
    buildCommands.push(...trigger.triggers);
  };

  const getOrAddTimeForRule = (file: string, modTimeIn?: number) => {
    // get the modtime of the against and cache it.
    if (!fileModMap.has(file)) {
      modTimeIn ??= statSync(file).mtimeMs;
      fileModMap.set(file, modTimeIn);
      return modTimeIn;
    } else {
      return fileModMap.get(file)!;
    }
  };

  // Check to see if we need to build
  for (const trigger of options.triggers) {
    debug(`Checking "${trigger.name}" for matches via ${trigger.match.join(",")}`);
    let compareAgainst: number;

    // check if this is a glob rule
    if (trigger.against.includes("*")) {
      // check to see if we know about this object already
      if (!fileModMap.has(trigger.against)) {
        // we don't, so try to figure out what has the lowest time
        let lowestTime = Number.POSITIVE_INFINITY;
        const globResults = await Array.fromAsync(glob(trigger.against, {exclude: trigger.ignores}));
        if (globResults.length <= 0) {
          addBuildCommands(trigger);
          continue;
        }
        for (const globbedFile of globResults) {
          const fileTime = statSync(globbedFile).mtimeMs;
          if (fileTime < lowestTime) {
            debug(`${globbedFile} lowest time is ${fileTime}`);
            lowestTime = fileTime;
          }
        }
        compareAgainst = getOrAddTimeForRule(trigger.against, lowestTime);
      } else {
        compareAgainst = fileModMap.get(trigger.against)!;
      }
    } else {
      // Check if the comparison file exists, if it doesn't, make the file.
      if (!existsSync(trigger.against)) {
        debug(`${trigger.name} - against file is missing ${trigger.against}, building`);
        addBuildCommands(trigger);
        continue;
      }

      // get the compare time for the map, or add it to the map if it doesn't exist already
      compareAgainst = getOrAddTimeForRule(trigger.against);
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
    lineBreak();
    log(`Running Build Rules: ${buildCommands.join(", ")}\n`);
  } else {
    log("No Build Necessary");
    return;
  }

  // build anything that exists.
  const lintCommands: BuildRule[] = [];
  for (const command of buildCommands) {
    const rule: BuildRule | undefined = options.rules.get(command);
    if (rule === undefined) {
      warn(`${command} - invalid build command was specified`);
      continue;
    }

    // Check if this only affects the build output
    if (rule.isTypeAction) {
      // Check if we can process these kinds of actions rn
      if (!canMakeLint)
        continue;

      // if it's a capture, we should move these instructions to the end of the build process
      if (rule.captures !== undefined) {
        lintCommands.push(rule);
        continue;
      }
      // otherwise, keep going
    }

    // if this build type is of an exec string
    if (typeof rule.buildCommand === "string") {
      const callback = async (output: string) => {
        debug(`${command} - executed build command ${rule.buildCommand.toString()}`);
        if (rule.output === undefined)
          return;

        if (rule.minify) {
          try {
            lineBreak();
            log(`Minifying ${rule.output}...`);
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
      if (typeof output === "string" && rule.output !== undefined) {
        lineBreak();
        log(`Created ${rule.output}`);
        await writeFile(rule.output, output);
      } else {
        debug(`Ran ${command}`);
      }
    }
  }

  // Generate any lints that are necessary
  if (lintCommands.length > 0) {
    lineBreak();
    log("Building lint configs");
    await generateLintRules(lintCommands);
  }
  lineBreak();
  log("Completed build");
}
