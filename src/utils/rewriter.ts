import type { Context } from "hono";
import { getHTMXConfigStr } from "../layout/helpers/includesTags";

class NonceInject {
  nonce: string|undefined;
  constructor(inNonce: string|undefined) {
    this.nonce = inNonce;
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
    el.setAttribute("nonce", this.nonce || "");
  }
}

export const serveStaticPage = async (c: Context, page?: string) => {
  const url: URL = new URL(c.req.url);
  const origin: string = url.origin;
  if (page === undefined)
    page = url.pathname.replace("/", "");

  const staticFile = await c.env.ASSETS!.fetch(`${origin}/pages/${page}.html`);
  if (staticFile.ok) {
    return new HTMLRewriter()
      .on("script, link[rel='stylesheet'], meta[name='htmx-config'], style", new NonceInject(c.get("secureHeadersNonce")))
      .transform(staticFile);
  }
  return c.notFound();
};