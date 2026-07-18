import { readFile } from "fs/promises";
import type { Context } from "hono";
import { isSSGContext } from "hono/ssg";
import has from "just-has";
import get from "just-safe-get";
import * as toml from "toml";

const IMPORTANT_ENV_FLAGS = ["RESET_BOT_USERNAME", "TURNSTILE_PUBLIC_KEY", "IN_DEV"];
export async function ssgGenEnvironment(c: Context, next: any) {
  if (isSSGContext(c)) {
    let needsEnvFlags = false;
    for (const flag of IMPORTANT_ENV_FLAGS) {
      if (!has(c.env, flag)) {
        needsEnvFlags = true;
        break;
      }
    }
    if (needsEnvFlags) {
      // Load up toml
      const wranglerFile = await readFile("wrangler.toml");
      const wranglerSettings = toml.parse(wranglerFile.toString());
      // Set the various vars that are needed
      for (const flag of IMPORTANT_ENV_FLAGS) {
        if (flag === "IN_DEV")
          continue;

        c.env[flag] = get(wranglerSettings.vars, flag);
      }
    }
  }
  await next();
};