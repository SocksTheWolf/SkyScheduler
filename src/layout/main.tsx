import { html } from 'hono/html';
import { Child } from 'hono/jsx';
import { PreloadRules } from '../types.d';
import { mainScriptStr } from '../utils/appScripts';
import { PreloadDependencyTags } from './helpers/includesTags';
import MetaTags from './helpers/metaTags';

type BaseLayoutProps = {
  children: Child;
  title?: string;
  mainClass?: string;
  preloads?: PreloadRules[]
};

export const BaseLayout = ({
  children,
  title = "SkyScheduler",
  mainClass = "",
  preloads = []
}: BaseLayoutProps) => {
  const layout = (
  <html data-theme="dark" lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>{title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="preload" href="/dep/htmx.min.js" as="script" />
      <link rel="preload" href="/dep/toastify.js" as="script" />
      <PreloadDependencyTags scripts={preloads} />

      <link rel="stylesheet" type="text/css" href="/dep/toastify.min.css" />
      <script type="text/javascript" src="/dep/htmx.min.js"></script>
      <script type="text/javascript" src="/dep/toastify.js"></script>
      <link rel="stylesheet" href="/dep/pico.min.css" />
      <link rel="stylesheet" href="/css/stylesheet.css" />
      <script type="text/javascript" src={mainScriptStr}></script>
      <MetaTags />
    </head>
    <body>
      <container class="pico">
        <main class={mainClass}>
          {children}
        </main>
      </container>
    </body>
  </html>);
  // inject the doctype so we're not in quirks mode
  return html`<!DOCTYPE html>
  ${layout}`;
}
