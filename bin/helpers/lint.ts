import * as prettier from "prettier";
import { writeFile } from "fs/promises";
import { CaptureType } from "../../src/enums";
import { debug } from "./console";
import { runCommandAsync } from "./subCommand";

// hardcoded variables/functions from the deps folder
const thirdPartyDependencies = {
  htmx: false,
  Dropzone: false,
  Toastify: false,
  Tribute: false,
  Countable: false,
  has: false,
  turnstile: false,
  // Pico Modals
  openModal: false,
  closeModal: false,
  // Pico Tabs
  PicoTabs: false,
  contentTabs: false,
};

export const lintRuleOutputFile = "jsrules.config.ts";

export async function generateLintRules(commands: BuildRule[]) {
  let combinedRules = "";
  let numReads = 0;

  const writeIfFinished = async (newData: string) => {
    ++numReads;
    combinedRules += newData;
    debug(`Reads: ${numReads}, Commands: ${commands.length}`);
    if (numReads >= commands.length) {
      const lineWrite = `export const configObject = {
        ${combinedRules}
        /* third party dependencies */
        ...${JSON.stringify(thirdPartyDependencies)}
        }`;

      const format = await prettier.format(lineWrite, { parser: "typescript"});
      await writeFile(lintRuleOutputFile, format);
      debug(`Wrote lint objects to ${lintRuleOutputFile}`);
    }
  };

  // See the correct way would allow you to put in a bunch of different files
  // and if you want to extract the function or const from it.
  //
  // Probably just via a chunk extraction process and then at the end of the promise chain it
  // builds up the entire combined rules and dumps it.
  //
  // Basically just make cat and sed into a single file.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-template-expression
  const constsSniffer = `sed "s/const \\(.*\\)=.*;/\\${1}: false,/g;t"`;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-template-expression
  const functionSniffer = `grep -Po \"(function (.*)\\()\" | sed "s/^function \\(.*\\)(/\\${1}: false,/g;t"`;

  // anyways, run through our instructions and make the file.
  for (const command of commands) {
    if (command.captures === undefined || typeof command.buildCommand !== "string")
      continue;

    const cmdStr: string = `${command.buildCommand} | ${command.captures == CaptureType.FUNCS ? functionSniffer : constsSniffer}`;
    await runCommandAsync(cmdStr, writeIfFinished);
  }
}
