// there's a lot of bad code in here, but it's fine because this is only a dev time tool
// and not runtime, so w/e
import { exec } from "node:child_process";
import { writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";

enum CaptureType {
  CONSTS,
  FUNCS
}

type LintGenRule = {
  files: string;
  rule: CaptureType
}

// hardcoded variables/functions from the deps folder
const thirdPartyDependencies = {
  htmx: false,
  Dropzone: false,
  Toastify: false,
  Tribute: false,
  openModal: false,
  closeModal: false,
  PicoTabs: false,
  Countable: false,
  has: false,
  turnstile: false,
  contentTabs: false,
};

const instructions: LintGenRule[] = [
  { files: "assets/js/*.js", rule: CaptureType.FUNCS },
  { files: "assets/js/consts.js", rule: CaptureType.CONSTS },
  { files: "assets/js/appSelectHelper.js", rule: CaptureType.CONSTS },
]

function createRules() {
  let combinedRules = "";
  let numReads = 0;
  const requiredReads = existsSync(path.join("assets/js", "consts.js")) ? instructions.length : instructions.length - 1;

  const writeIfFinished = () => {
    if (numReads >= requiredReads) {
        const lineWrite = `export const configObject = {
        ${combinedRules}
        /* third party dependencies */
        ...${JSON.stringify(thirdPartyDependencies)}
        }`;

        writeFileSync("jsrules.config.ts", lineWrite);
    }
  };

  // See the correct way would allow you to put in a bunch of different files
  // and if you want to extract the function or const from it.
  //
  // Probably just via a chunk extraction process and then at the end of the promise chain it
  // builds up the entire combined rules and dumps it.
  //
  // Basically just make cat and sed into a single file.
  const constsSniffer = `sed "s/const \\(.*\\)=.*;/\\${1}: false,/g;t"`;
  const functionSniffer = `grep -Po \"(function (.*)\\()\" | sed "s/^function \\(.*\\)(/\\${1}: false,/g;t"`;

  // anyways, run through our instructions and make the file.
  for (const command of instructions) {
    const cmdStr = `cat ${command.files} | ${command.rule == CaptureType.FUNCS ? functionSniffer : constsSniffer}`;
    exec(cmdStr, (_error, stdOut, _stdErr) => {
        ++numReads;
        combinedRules += stdOut;
        writeIfFinished();
    });
  }
  writeIfFinished();
}

createRules();