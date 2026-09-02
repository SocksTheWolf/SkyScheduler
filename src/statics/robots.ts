import { SITE_URL } from "../appInfo";
import { PUBLIC_OPENAPI_SPEC } from "../config";

interface RobotRule {
  agent: string;
  allow?: string[];
  disallow?: string[];
}

// Put robots.txt rules in here.
const defaultRules: RobotRule[] = [
  {
    agent: "*",
    disallow: [
      "*.js$",
      "*.css$",
      "/admin",
      "/thumbs",
      "/icons",
      "/fonts",
      "/funding",
      "/reset",
      "/reset-password",
      "/preview",
      "/admin",
      "/setup"
    ],
  },
];

export function generateRobotsTxt(): string {
  let outputStr = "";
  // by default, do not allow robots to look at /openapi.json
  if (PUBLIC_OPENAPI_SPEC) {
    defaultRules[0].disallow?.push("/openapi.json");
  }

  for (const rule of defaultRules) {
    outputStr += `User-agent: ${rule.agent}\n`;

    if (rule.allow !== undefined)
      outputStr += rule.allow.map((itm) => `Allow: ${itm}`).join("\n");

    if (rule.disallow !== undefined)
      outputStr += rule.disallow.map((itm) => `Disallow: ${itm}`).join("\n");

    outputStr += "\n";
  }
  outputStr += `\n\nSitemap: ${SITE_URL}/sitemap.xml`;
  return outputStr;
}
