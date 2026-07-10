// fun little quirk of CF esbuild, you can read directly from files
// this does save a lot on overhead, but typescript hates it.

// @ts-ignore
import robots from "../../assets/robots.txt";
import { SITE_URL } from "../siteinfo";

// yes this is really that silly
export function robotsGenerate() {
  return `${robots}\n\nSitemap: ${SITE_URL}/sitemap.xml`
};