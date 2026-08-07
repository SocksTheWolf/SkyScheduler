import { readFile } from "fs/promises";
import { createMiddleware } from "hono/factory";
import { isSSGContext } from "hono/ssg";
import { getHTMXConfigStr } from "../layout/helpers/includesTags";
import { USE_GRANULAR_CSP_SETTINGS, USE_STATIC_HTML } from "../limits";
import type { BaseContext } from "../types";
import { has } from "../utils/helpers";

type SSGServeProps = {
  page: string;
};

class NonceInject {
  nonce: string;
  constructor(inNonce: string|undefined) {
    this.nonce = inNonce ?? "";
  }
  element(el: Element) {
    if (el.tagName === "meta") {
      el.replace(getHTMXConfigStr(this.nonce), {html: true});
      return;
    }
    if (el.tagName === "script") {
      const scriptType: string|null = el.getAttribute("type");
      // skip anything that uses script but does not need the nonce
      if (scriptType !== null &&
          scriptType !== "text/javascript" &&
          scriptType !== "application/javascript" &&
          scriptType !== "module") {
        return;
      }
    }
    el.setAttribute("nonce", this.nonce);
  }
}


const serveStaticPage = async (c: BaseContext, page?: string): Promise<Response> => {
  // if we're explicitly not given a page, then take the current path name removing the slash
  page ??= new URL(c.req.url).pathname.replace(/^\//, "");

  // domain doesn't matter, so make this whatever
  const staticFile: Response = await c.env.ASSETS!.fetch(`https://1.1.1.1/pages/${page}.html`);
  if (staticFile.ok) {
    if (USE_GRANULAR_CSP_SETTINGS) {
      // write the nonce into the static page, dynamically. Saves on render paint processing.
      return new HTMLRewriter()
        .on("script, link[rel='stylesheet'], meta[name='htmx-config'], style",
          new NonceInject(c.get("secureHeadersNonce")))
        .transform(staticFile);
    } else {
      return staticFile;
    }
  }
  return c.notFound();
};

export const ssgServe = (props?: SSGServeProps) => {
  return createMiddleware(async (c: BaseContext, next: any) => {
    if (USE_STATIC_HTML && !isSSGContext(c))
      return serveStaticPage(c, props?.page);
    await next();
  });
};

// Middleware to help during the generation of SSG content. Does nothing in runtime.
const IMPORTANT_ENV_FLAGS = ["RESET_BOT_USERNAME", "TURNSTILE_PUBLIC_KEY", "IN_DEV"];
export async function ssgGenMiddleware(c: BaseContext, next: any) {
  // Are we building SSG content right now?
  if (isSSGContext(c)) {
    // Check if we need to add any flags that are missing (speeds up rebuild)
    let needsEnvFlags = false;
    for (const flag of IMPORTANT_ENV_FLAGS) {
      if (!has(c.env, flag)) {
        needsEnvFlags = true;
        break;
      }
    }
    // If we need to build up missing flags, do so.
    if (needsEnvFlags) {
      // Load up toml
      const toml = await import("toml");
      const wranglerFile = (await readFile("wrangler.toml")).toString();
      const wranglerSettings = toml.parse(wranglerFile);
      // Set the various vars that are needed
      for (const flag of IMPORTANT_ENV_FLAGS) {
        if (flag === "IN_DEV")
          continue;

        c.env[flag] = wranglerSettings.vars[flag] ?? "";
      }

      // laziest way to load a single flag from a .env
      // for security reasons, we don't need to load any other flags
      try {
        const envFile = (await readFile(".env")).toString();
        const inDev: boolean = envFile.search("IN_DEV=true") >= 0;
        c.env.IN_DEV = inDev ? "true" : "false";
      } catch (_err) {
        // file doesn't exist, but drop this anyways.
        c.env.IN_DEV = "false";
      }
    }
  }
  await next();
};