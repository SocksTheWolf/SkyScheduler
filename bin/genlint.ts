// there's a lot of bad code going on in here, but it's fine because this is only a dev time tool
// and not runtime, so w/e
import { exec } from "node:child_process";
import { writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";

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

function writeRules(rules: string) {
  const lineWrite = `export const configObject = {
  ${rules}
  /* third party dependencies */
  ...${JSON.stringify(thirdPartyDependencies)}
  }`;

  writeFileSync("jsrules.config.ts", lineWrite);
}

function createRules() {
  let combinedRules = "";
  let numReads = 0;
  const hasGlobalDefs = existsSync(path.join("assets/js", "consts.js"));
  const requiredReads = hasGlobalDefs ? 3 : 2;

  const writeIfFinished = () => {
    if (numReads >= requiredReads)
      writeRules(combinedRules);
  }
  const constsSniffer = `sed "s/const \\(.*\\)=.*;/\\${1}: false,/g;t"`;
  const command = `cat assets/js/*.js | grep -Po \"(function (.*)\\()\" | sed "s/^function \\(.*\\)(/\\${1}: false,/g;t"`;
  exec(command,
    (_error, stdOut, _stdErr) => {
      ++numReads;
      combinedRules += stdOut;
      writeIfFinished();
  });

  // grab all the consts defines and make them globals
  if (hasGlobalDefs) {
    const constsCommand = `cat assets/js/consts.js | ${constsSniffer}`
    exec(constsCommand,
      (_error, stdOut, _stdErr) => {
        ++numReads;
        combinedRules += stdOut;
        writeIfFinished();
    });
  }

  const constsCommand = `cat assets/js/appSelectHelper.js | ${constsSniffer}`
  exec(constsCommand,
    (_error, stdOut, _stdErr) => {
      ++numReads;
      combinedRules += stdOut;
      writeIfFinished();
  });

  writeIfFinished();
}

createRules();