import type { Context } from "hono";

// Instead of using hono cache, we use CF's worker cache.
export async function cachePublicMiddleware(c: Context, next: any) {
  c.res.headers.set("Cache-Control", "public, max-age=600, stale-while-revalidate=3600");
  await next();
};

export async function cacheStaticFileMiddleware(c: Context, next: any) {
  c.res.headers.set("Cache-Control", 'public, max-age=604800, stale-while-revalidate=100000, must-revalidate, proxy-revalidate');
  await next();
};

export async function cachePrivateMiddleware(c: Context, next: any) {
  c.res.headers.set("Cache-Control", "private");
  await next();
};