// this file handles injecting speculation rules.
import { raw } from "hono/html";
import { ALLOW_SPECULATION_RULES } from "../../config";

export function SpeculationRulesTag() {
  if (!ALLOW_SPECULATION_RULES)
    return (<></>);

  const speculationDefines = {
    prerender: [
      {
        where: {
          and: [
            { href_matches: "/*" },
            // sensitive pages
            { not: { href_matches: "/(dashboard|reset)" } },
            // redirects
            { not: { href_matches: "/(reset|tip|contact|bsky|source)" } },
          ]
        },
        eagerness: "moderate",
      },
    ],
    // fetch everything that's not outside the main site
    prefetch: [{ where: { not: { href_matches: "/*" } }, eagerness: "moderate" }],
  };
  return <script type="speculationrules">{raw(JSON.stringify(speculationDefines))}</script>;
}
