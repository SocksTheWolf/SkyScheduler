import { Context } from "hono";
import { NONCE, secureHeaders } from "hono/secure-headers";
import isEmpty from "just-is-empty";
import { USE_CSP_REPORT_ONLY, USE_GRANULAR_CSP_SETTINGS } from "../limits";

export async function secureHeadersMiddleware(c: Context, next: any) {
  const cspReportURL = c.env.CSP_REPORT_URL;
  const hasReportURL = !isEmpty(cspReportURL);
  const secPolicy = {
      baseUri: ["'none'"],
      connectSrc: ["'self'", cspReportURL, "https://challenges.cloudflare.com", "https://cardyb.bsky.app",
        "https://bsky.social", "https://public.api.bsky.app"],
      imgSrc: ["'self'", 'data:', 'blob:', "https://cdn.bsky.app"],
      mediaSrc: ["'self'", 'data:', 'blob:'],
      frameSrc: ["'self'", "https://challenges.cloudflare.com"],
      scriptSrc: ['https:', NONCE, "'strict-dynamic'"],
      scriptSrcAttr: ["'none'"],
      scriptSrcElem: ["'self'", "https://challenges.cloudflare.com", NONCE],
      styleSrcElem: ["'self'", NONCE],
      styleSrcAttr: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      pluginTypes: ["'none'"],
      fontSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'none'"],
      objectSrc: ["'none'"],
      reportTo: hasReportURL ? "report-csp" : undefined,
      reportUri: hasReportURL ? cspReportURL : undefined
  };
  const middleware = secureHeaders(USE_GRANULAR_CSP_SETTINGS ? {
    contentSecurityPolicy: USE_CSP_REPORT_ONLY ? undefined : secPolicy,
    contentSecurityPolicyReportOnly: USE_CSP_REPORT_ONLY ? secPolicy : undefined,
    referrerPolicy: "strict-origin-when-cross-origin",
    xXssProtection: false,
    reportTo: hasReportURL ? [{group: "report-csp", max_age: 10886400, endpoints: [{url: cspReportURL}]}] : undefined,
    removePoweredBy: true,
    crossOriginOpenerPolicy: "same-origin",
    strictTransportSecurity: "max-age=31536000; includeSubDomains; preload",
    xFrameOptions: "DENY"
  } : undefined);
  return middleware(c, next);
};