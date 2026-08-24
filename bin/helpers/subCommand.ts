import { exec } from "node:child_process";
import { promisify } from "node:util";

const asyncExec = promisify(exec);

export async function runCommandAsync(command: string, callback: CommandCallbackFunction) {
  try {
    const { stdout } = await asyncExec(command, {windowsHide: true});
    await callback(stdout);
  } catch (ex) {
    console.error(`Encountered error with cmd "${command}": ` + String(ex));
  }
}

