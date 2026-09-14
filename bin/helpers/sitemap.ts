import { statSync } from "node:fs";
import { glob } from "node:fs/promises";
import { SITE_URL } from "../../src/appInfo";
import { sitemapIgnoreFiles } from "../configs/sitemapIgnore";

export async function buildSitemap() {
  const page: SitemapPageInfo[] = [];

  // build up sitemap page information
  for await (const filePath of glob("assets/pages/*", {exclude: sitemapIgnoreFiles})) {
    page.push({
      url: filePath.replace(/(assets\\pages\\|assets\/pages\/|index|\.html)/g, ""),
      lastMod: statSync(filePath).mtime.toISOString()
    });
  }

  // dump out the entire sitemap file.
  return (`<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${page.map((page) => `\t<url>\n\t\t<loc>${SITE_URL}/${page.url}</loc>\n\t\t<lastmod>${page.lastMod}</lastmod>\n\t</url>`).join('\n')}
  </urlset>`);
}