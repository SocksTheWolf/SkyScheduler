import { Context } from "hono";

class NonceInject {
  nonce: string|undefined;
  constructor(inNonce: string|undefined) {
    this.nonce = inNonce;
  }
  element(el: Element) {
    if (el.tagName === "meta") {
      el.replace(`<meta name="htmx-config" content='{"allowEval":false,"inlineScriptNonce":"${this.nonce}","inlineStyleNonce":"${this.nonce}"}'/>`, {html: true});
      return;
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