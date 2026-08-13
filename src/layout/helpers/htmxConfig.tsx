import { raw } from "hono/html";
import type { LooseObj, NoncePropType } from "../../types";

export function getHTMXConfigStr(nonce: string | undefined) {
  const HTMXConfigObj: LooseObj = {
    responseHandling: [
      { code: "204", swap: false },
      { code: "400", swap: false, error: true },
      { code: "404", swap: true, error: true },
      { code: "[234]..", swap: true, error: false },
      { code: "500", swap: true, error: true },
      { code: "[5]..", swap: false, error: true },
      { code: "...", swap: true },
    ],
  };
  if (nonce !== undefined) {
    HTMXConfigObj.allowEval = false;
    HTMXConfigObj.inlineScriptNonce =
      HTMXConfigObj.inlineStyleNonce = nonce;
  }

  return `<meta name="htmx-config" content='${JSON.stringify(HTMXConfigObj)}' />`;
}

export function HTMXConfig({ nonce }: NoncePropType) {
  return raw(getHTMXConfigStr(nonce));
}

