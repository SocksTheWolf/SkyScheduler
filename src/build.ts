import type { Context, Hono } from "hono";
import { toSSG } from "hono/ssg";
import fs from 'fs/promises';
import { HonoBase } from "./types";

export default async function buildStaticSite(c: Context, app: Hono<HonoBase>) {
  const response = await toSSG(app, fs, {
    dir: "/assets/pages"
  });
  return c.text(response.success.toString(), 200);
}