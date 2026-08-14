import { exec } from "node:child_process";

export function runCommand(command: string, callback: CommandCallbackFunction) {
  exec(command, (_error, stdOut, _stdErr) => {
    callback(stdOut);
  });
}

export function runCommandAsync(command: string, callback: CommandCallbackFunction) {
  exec(command, async (_error, stdOut, _stdErr) => {
    await callback(stdOut);
  });
}

