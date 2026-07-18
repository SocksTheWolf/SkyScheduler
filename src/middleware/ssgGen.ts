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
      const wranglerFile = (await readFile("wrangler.toml")).toString();
      const wranglerSettings = toml.parse(wranglerFile);
      // Set the various vars that are needed
      for (const flag of IMPORTANT_ENV_FLAGS) {
        if (flag === "IN_DEV")
          continue;

        c.env[flag] = get(wranglerSettings.vars, flag);
      }

      // laziest way to load a single flag from a .env
      try {
        const envFile = (await readFile(".env")).toString();
        const inDev: boolean = envFile.search("IN_DEV=true") >= 0;
        c.env["IN_DEV"] = inDev;
      } catch (err) {
        // file doesn't exist, but drop this anyways.
        c.env["IN_DEV"] = false;
      }
    }
  }
  await next();
};