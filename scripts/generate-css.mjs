import { execSync } from "node:child_process";
import { writeSync, openSync } from "fs";

execSync("tailwindcss -i ./src/main.css -o ./misc/generated.css --minify");

const css = execSync("cat misc/generated.css")
  .toString()
  .replaceAll("\\", "\\\\");

const path = "src/css.ts";
const cssFile = `export const css = \`${css};\``;

writeSync(openSync(path, "w"), cssFile);
