import { html } from 'hono/html';
import { Child } from 'hono/jsx';
import { APP_NAME } from "../siteinfo";
import { PreloadRules } from '../types';
import { mainScriptStr } from '../utils/appScripts';
import { PreloadDependencyTags } from './helpers/includesTags';
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

  const layout = (
    <html data-theme="dark" lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>{APP_NAME} - {props.title}</title>
        {noIndex ? <meta name="robots" content="noindex" /> : null}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="preload" href="/logo.svg" as="image" type="image/svg+xml" />
        <link rel="preload" href="/dep/htmx.min.js" as="script" />
        <link rel="preload" href="/dep/toastify.js" as="script" />
        <PreloadDependencyTags scripts={preloads} />

        <link rel="stylesheet" type="text/css" href="/dep/toastify.min.css" />
        <script type="text/javascript" src="/dep/htmx.min.js"></script>
        <script type="text/javascript" src="/dep/toastify.js"></script>
        <link rel="stylesheet" href="/dep/pico.min.css" />
        <link rel="stylesheet" href="/css/stylesheet.min.css" />
        <script type="text/javascript" src={mainScriptStr}></script>
        <MetaTags />
      </head>
      <body>
        <container class="pico">
          <main class={mainClass}>
            {props.children}
          </main>
        </container>
      </body>
    </html>
  );

  // inject the doctype so we're not in quirks mode
  return html`<!DOCTYPE html>
  ${layout}`;
}
