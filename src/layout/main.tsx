import { raw } from 'hono/html';
import { Child } from 'hono/jsx';
import { ScriptInclusionLevel } from '../enums';
import { APP_NAME } from "../siteinfo";
import { dashboardStyleStr, dependModsStyleStr, mainScriptStr } from '../statics/appScripts';
import { constScriptStr } from '../statics/constScript';
import type { BaseElementProps } from "../types";
import { IncludeDependencyTags, PreloadDependencyTags, type PreloadRules } from "./helpers/includesTags";
import { MetaTags, PersonaTags } from './helpers/metaTags';

type BaseLayoutProps = BaseElementProps & {
  children: Child;
  title: string;
  noIndex?: boolean;
  mainClass?: string;
  interactivity?: ScriptInclusionLevel;
  preloads?: PreloadRules[];
  nonce?: string;
};

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

export const BaseLayout = (props: BaseLayoutProps) => {
  let preloadList: PreloadRules[] = [];
  let scriptIncludeList: PreloadRules[] = [];

  switch (props.interactivity) {
    case ScriptInclusionLevel.NonInteractive:
      preloadList = defaultPreloads;
    break;
    default:
    case ScriptInclusionLevel.Interactive:
      preloadList = appDefaultPreloads;
    break;
    case ScriptInclusionLevel.DashboardApp:
      preloadList = dashboardDefaultPreloads;
    break;
  }
  scriptIncludeList = preloadList;
  // Preloaded scripts that were pushed in should
  // implement their own includes into the DOM
  if (props.preloads !== undefined)
    preloadList = preloadList.concat(props.preloads);

  const htmxConfig = `<meta name="htmx-config"
    content='{"allowEval": false, "inlineScriptNonce": "${props.nonce}",
    "inlineStyleNonce": "${props.nonce}"}' />`;

  return (<>
  {raw("<!DOCTYPE html>")}
  <html data-theme="dark" lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>{APP_NAME} - {props.title}</title>
      <MetaTags />
      <PreloadDependencyTags scripts={preloadList} />
      <PersonaTags />
      {props.noIndex ? <meta name="robots" content="noindex" /> : null}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="manifest" href="/site.webmanifest" />
      <link rel="preload" href="/logo.svg" as="image" type="image/svg+xml" />
      <IncludeDependencyTags scripts={scriptIncludeList} nonce={props.nonce} />
      {props.nonce !== undefined && props.interactivity != ScriptInclusionLevel.NonInteractive
        ? raw(htmxConfig) : null}
    </head>
    <body>
      <container class="pico">
        <main class={props.mainClass}>
          {props.children}
        </main>
      </container>
    </body>
  </html>
  </>);
}
