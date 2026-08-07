import type { BaseContext, NextMiddleware } from "../types";

// Instead of using hono cache, we use CF's worker cache.
export async function cachePublicMiddleware(c: BaseContext, next: NextMiddleware) {
  c.res.headers.set("Cache-Tag", "static");
  c.res.headers.set("Cache-Control", "public, max-age=600, stale-while-revalidate=3600");
  await next();
};

export async function cacheStaticFileMiddleware(c: BaseContext, next: NextMiddleware) {
  c.res.headers.set("Cache-Tag", "staticfiles,static");
  c.res.headers.set("Cache-Control", "public, max-age=604800, stale-while-revalidate=100000, immutable, must-revalidate");
  await next();
};

export async function cachePrivateMiddleware(c: BaseContext, next: NextMiddleware) {
  c.res.headers.set("Cache-Tag", "private");
  c.res.headers.set("Cache-Control", "private, max-age=20, stale-while-revalidate=10, must-revalidate");
  await next();
};