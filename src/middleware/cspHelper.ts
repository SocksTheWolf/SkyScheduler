import type { Context } from "hono";
import { NONCE } from "hono/secure-headers";
import { isSSGContext } from "hono/ssg";
import isEmpty from "just-is-empty";
import { USE_CSP_REPORT_ONLY, USE_GRANULAR_CSP_SETTINGS } from "../limits";
import { isInDev } from "../utils/helpers";

export async function cspHelper(c: Context, next: any) {
  const cspReportURL = c.env.CSP_REPORT_URL;
  const hasReportURL = !isEmpty(cspReportURL);

  if (USE_GRANULAR_CSP_SETTINGS && !isSSGContext(c)) {
    // note: the directive parameter is not actually used.
    const nonceVal = NONCE(c, "");

    const secPolicy = {
      "base-uri": ["'none'"],
      "connect-src": ["'self'", cspReportURL,
        "https://challenges.cloudflare.com", "https://cardyb.bsky.app",
        "https://bsky.social", "https://public.api.bsky.app"],
      "img-src": ["'self'", 'data:', 'blob:', "https://cdn.bsky.app"],
      "media-src": ["'self'", 'data:', 'blob:'],
      "frame-src": ["'self'", "https://challenges.cloudflare.com"],
      "script-src": ['https:', nonceVal, "'strict-dynamic'"],
      "script-src-attr": ["'none'"],
      "script-src-elem": ["'self'", "https://challenges.cloudflare.com", nonceVal, "'report-sample'"],
      "style-src-elem": ["'self'", nonceVal, "'report-sample'"],
      "style-src-attr": ["'none'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "font-src": ["'self'"],
      "manifest-src": ["'self'"],
      "worker-src": ["'none'"],
      "object-src": ["'none'"],
    };

    let CSPDefinitionHeader = "";
    for (const [directive, value] of Object.entries(secPolicy)) {
      CSPDefinitionHeader += `${directive} ${value.join(" ")}; `;
    }

    if (hasReportURL) {
      CSPDefinitionHeader += `report-to report-csp; report-uri ${cspReportURL}`;
      c.res.headers.set("Reporting-Endpoints", `report-csp=${cspReportURL}`)
    }

    // Manually inject the CSP headers
    if (USE_CSP_REPORT_ONLY || isInDev(c.env)) {
      c.res.headers.set("content-security-policy-report-only", CSPDefinitionHeader);
    } else {
      c.res.headers.set("content-security-policy", CSPDefinitionHeader);
    }
  }
  await next();
};