import fs from 'fs/promises';
import type { Hono } from "hono";
import { toSSG } from "hono/ssg";
import type { HonoBase } from "../types";

export default async function buildStaticSite(app: Hono<HonoBase>) {
  const response = await toSSG(app, fs, {
    dir: "../pages"
  });
  console.log(response);
  return response.success.toString();
}