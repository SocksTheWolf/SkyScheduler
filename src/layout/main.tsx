import { raw } from 'hono/html';
import { Child } from 'hono/jsx';
import { APP_NAME } from "../siteinfo";
import { mainScriptStr } from '../utils/appScripts';
import { IncludeDependencyTags, PreloadDependencyTags, PreloadRules } from "./helpers/includesTags";
import { MetaTags, PersonaTags } from './helpers/metaTags';

type BaseLayoutProps = {
  children: Child;
  title: string;
  noIndex?: boolean;
  mainClass?: string;
  simple?: boolean;
  preloads?: PreloadRules[]
};

export const BaseLayout = (props: BaseLayoutProps) => {
  const noIndex = (props.noIndex !== undefined) ? props.noIndex : false;
  const mainClass = (props.mainClass !== undefined) ? props.mainClass : "";
  const preloads = (props.preloads !== undefined) ? props.preloads : [];
  const defaultPreloads: PreloadRules[] = [
    {type: "style", href: "/dep/pico.min.css"},
    {type: "style", href: "/css/stylesheet.min.css"},
  ];
  const appDefaultPreloads: PreloadRules[] = [
    {type: "style", href: "/dep/toastify.min.css"},
    {type: "script", href: "/dep/htmx.min.js"},
    {type: "script", href: "/dep/toastify.js"},
    ...defaultPreloads,
    {type: "script", href: mainScriptStr}
  ];

  let preloadList: PreloadRules[] = [];
  if (props.simple)
    preloadList.concat(defaultPreloads);
  else
    preloadList.concat(appDefaultPreloads);
  preloadList.concat(preloads);

  return (<>
  {raw("<!DOCTYPE html>")}
  <html data-theme="dark" lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>{APP_NAME} - {props.title}</title>
      <MetaTags />
      {noIndex ? <meta name="robots" content="noindex" /> : null}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="manifest" href="/site.webmanifest" />
      <link rel="preload" href="/logo.svg" as="image" type="image/svg+xml" />
      <PreloadDependencyTags scripts={preloadList} />
      <IncludeDependencyTags scripts={props.simple ? defaultPreloads : appDefaultPreloads} />
      <PersonaTags />
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
