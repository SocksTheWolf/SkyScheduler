// This is a separate file to help create includes lists
import { ScriptInclusionLevel } from "../../enums";
import { dashboardStyleStr, dependModsStyleStr, mainScriptStr } from "../../statics/appScripts";
import { constScriptStr } from "../../statics/constScript";
import type { PreloadRules } from "../../types";

// Basic scripts, no interactivity
const defaultPreloads: PreloadRules[] = [
  {type: "style", href: "/dep/pico.min.css"},
  {type: "style", href: "/css/stylesheet.min.css"},
];

// Interactivity scripts
const appDefaultPreloads: PreloadRules[] = [
  {type: "style", href: "/dep/toastify.min.css"},
  {type: "script", href: "/dep/htmx.min.js"},
  {type: "script", href: "/dep/toastify.js"},
  ...defaultPreloads,
  {type: "script", href: mainScriptStr}
];

// Application scripts
const dashboardDefaultPreloads: PreloadRules[] = [
  ...appDefaultPreloads,
  {href: dashboardStyleStr, type: "style"},
  {href: "/dep/countable.min.js", type: "script"},
  {href: "/dep/form-json.min.js", type: "script"},
  {href: "/dep/modal.min.js", type: "script"},
  {href: "/dep/tabs.min.js", type: "script"},
  {href: "/dep/has.min.js", type: "script"},
  {type: "script", href: constScriptStr },
  {type: "script", href: "/dep/dropzone.min.js"},
  {type: "style", href: "/dep/dropzone.min.css"},
  {type: "style", href: "/dep/tribute.min.css"},
  {type: "style", href: dependModsStyleStr},
  {type: "script", href: "/dep/tribute.min.js"}
];

export function getScriptsForInteractivity(interactiveLevel?: ScriptInclusionLevel): PreloadRules[] {
  switch (interactiveLevel) {
    case ScriptInclusionLevel.NonInteractive:
      return defaultPreloads;
    default:
    case ScriptInclusionLevel.Interactive:
      return appDefaultPreloads;
    case ScriptInclusionLevel.DashboardApp:
      return dashboardDefaultPreloads;
  }
}
