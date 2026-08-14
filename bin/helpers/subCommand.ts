import { exec } from "node:child_process";

export function runCommandAsync(command: string, callback: CommandCallbackFunction) {
  exec(command, async (_error, stdOut, _stdErr) => {
    await callback(stdOut);
  });
}

