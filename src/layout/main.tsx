import { raw } from 'hono/html';
import { Child } from 'hono/jsx';
import { APP_NAME } from "../siteinfo";
import { mainScriptStr } from '../utils/appScripts';
import { IncludeDependencyTags, PreloadDependencyTags, PreloadRules } from "./helpers/includesTags";
import MetaTags from './helpers/metaTags';

type BaseLayoutProps = {
  children: Child;
  title: string;
  noIndex?: boolean;
  mainClass?: string;
  preloads?: PreloadRules[]
};

export const BaseLayout = (props: BaseLayoutProps) => {
  const noIndex = (props.noIndex !== undefined) ? props.noIndex : false;
  const mainClass = (props.mainClass !== undefined) ? props.mainClass : "";
  const preloads = (props.preloads !== undefined) ? props.preloads : [];
  const defaultPreloads: PreloadRules[] = [
    {type: "style", href: "/dep/toastify.min.css"},
    {type: "script", href: "/dep/htmx.min.js"},
    {type: "script", href: "/dep/toastify.js"},
    {type: "style", href: "/dep/pico.min.css"},
    {type: "style", href: "/css/stylesheet.min.css"},
    {type: "script", href: mainScriptStr}
  ]

  return (<>
  {raw("<!DOCTYPE html>")}
  <html data-theme="dark" lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>{APP_NAME} - {props.title}</title>
      {noIndex ? <meta name="robots" content="noindex" /> : null}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="icon" type="image/png" href="/favicon.png" />
      <link rel="preload" href="/logo.svg" as="image" type="image/svg+xml" />
      <PreloadDependencyTags scripts={[...defaultPreloads, ...preloads]} />
      <MetaTags />
      <IncludeDependencyTags scripts={defaultPreloads} />
    </head>
    <body>
      <container class="pico">
        <main class={mainClass}>
          {props.children}
        </main>
      </container>
    </body>
  </html>
  </>);
}
