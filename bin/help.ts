import { readFile } from "fs/promises";
import type { LooseObj } from "../src/types";
import { lineBreak, sys } from "./helpers/console";

async function main() {
  console.clear();
  const packageData: string = await readFile("package.json", "ascii");
  const jsonObj: LooseObj = JSON.parse(packageData);
  sys("SkyScheduler Commands:");
  lineBreak();
  for (const [key, value] of Object.entries(jsonObj.scriptsComments as LooseObj)) {
    sys(`\x1b[36mnpm run ${key}\x1b[0m - `);
    sys(`\t${value as string}\n`);
  }
}

await main();