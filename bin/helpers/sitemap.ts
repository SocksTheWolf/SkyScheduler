import { statSync } from "node:fs";
import { glob } from "node:fs/promises";
import { SITE_URL } from "../../src/appInfo";

type PageInfo = {
  url: string;
  lastMod: string;
}

export async function buildSitemap() {
  const ignoreFiles: string[] = ["**/forgot.html", "**/reset.html", "**/dashboard.html"];
  /homepage|\\.tsx/g
  const page: PageInfo[] = [];
  for await (const filePath of glob("assets/pages/*", {exclude: ignoreFiles})) {
    page.push({url: filePath.replace(/(assets\\pages\\|assets\/pages\/|index|\.html)/g, ""), lastMod: statSync(filePath).mtime.toISOString() });
  }
  return await (`<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${page.map((page) => `\t<url>\n\t\t<loc>${SITE_URL}/${page.url}</loc>\n\t\t<lastmod>${page.lastMod}</lastmod>\n\t</url>`).join('\n')}
  </urlset>`);
}