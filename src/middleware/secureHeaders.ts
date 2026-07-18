import type { Context } from "hono";
import { secureHeaders } from "hono/secure-headers";

export async function secureHeadersMiddleware(c: Context, next: any) {
  // Supposedly secureHeaders is eating up the majority of render time, so we
  // do not use the CSP headers from here. Instead, we opt to do them manually
  // in the cspHelper middleware
  const middleware = secureHeaders({
    referrerPolicy: "strict-origin-when-cross-origin",
    xXssProtection: false,
    removePoweredBy: true,
    crossOriginOpenerPolicy: "same-origin",
    strictTransportSecurity: "max-age=31536000; includeSubDomains; preload",
    xFrameOptions: "DENY"
  });

  return middleware(c, next);
};