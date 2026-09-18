import { NONCE } from "hono/secure-headers";
import isEmpty from "just-is-empty";
import { APP_HOSTNAME_INFO } from "../appInfo";
import { USE_CSP_REPORT_ONLY, USE_GRANULAR_CSP_SETTINGS } from "../config";
import type { BaseContext, NextMiddleware } from "../types";
import { isInDev } from "../utils/helpers";

export async function cspHelper(c: BaseContext, next: NextMiddleware) {
  const hasReportURL = !isEmpty(APP_HOSTNAME_INFO.csp);

  if ((USE_GRANULAR_CSP_SETTINGS || USE_CSP_REPORT_ONLY) && !c.get("ssg")) {
    // note: the directive parameter is not actually used.
    const nonceVal = NONCE(c, "");

    const secPolicy = {
      "base-uri": ["'none'"],
      "default-src": ["'none'"],
      "connect-src": [
        "'self'",
        "https://challenges.cloudflare.com",
        "https://plc.directory",
        "https://cardyb.bsky.app",
        "https://bsky.social",
        "https://public.api.bsky.app",
        "https://public.bsky.social",
      ],
      "img-src": ["'self'", "data:", "blob:", "https://cdn.bsky.app"],
      "media-src": ["'self'", "data:", "blob:"],
      "frame-src": ["'self'", "https://challenges.cloudflare.com"],
      "script-src": [
        "'self'",
        nonceVal,
        "https://challenges.cloudflare.com",
        "'strict-dynamic'",
      ],
      "script-src-attr": ["'none'"],
      "script-src-elem": [
        "'self'",
        "https://challenges.cloudflare.com",
        nonceVal,
        "'report-sample'",
      ],
      "style-src": ["'self'", nonceVal, "'report-sample'"],
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

    if (hasReportURL) {
      secPolicy["connect-src"].push(`https://${APP_HOSTNAME_INFO.csp}`);
      CSPDefinitionHeader += `report-to report-csp; report-uri ${APP_HOSTNAME_INFO.csp} `;
      c.res.headers.set("Reporting-Endpoints", `report-csp=${APP_HOSTNAME_INFO.csp}`);
    }

    for (const [directive, value] of Object.entries(secPolicy)) {
      CSPDefinitionHeader += `${directive} ${value.join(" ")}; `;
    }

    // Manually inject the CSP headers
    if (USE_CSP_REPORT_ONLY || isInDev(c.env)) {
      c.res.headers.set("content-security-policy-report-only", CSPDefinitionHeader);
    } else {
      c.res.headers.set("content-security-policy", CSPDefinitionHeader);
    }
  }
  await next();
}
