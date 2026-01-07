import { html } from 'hono/html';
import { Child } from 'hono/jsx';
import MetaTags from './metaTags';
import { PreloadRules } from '../types.d';
import { CURRENT_SCRIPT_VERSION } from '../limits.d';
import { PreloadDependencyTags } from './depTags';

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
  return html`<!DOCTYPE html>
  <html data-theme="dark">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="preload" href="/dep/htmx.min.js" as="script" />
      <link rel="preload" href="/dep/toastify.js" as="script" />
      ${<PreloadDependencyTags scripts={preloads} />}

      <link rel="stylesheet" type="text/css" href="/dep/toastify.min.css" />
      <script type="text/javascript" src="/dep/htmx.min.js"></script>
      <script type="text/javascript" src="/dep/toastify.js"></script>
      <link rel="stylesheet" href="/dep/pico.min.css" />
      <link rel="stylesheet" href="/css/stylesheet.css" />
      <script type="text/javascript" src="/js/main.min.js?v=${CURRENT_SCRIPT_VERSION}"></script>
      <title>${title}</title>
      ${<MetaTags />}
    </head>
    <body>
      <main class="${mainClass}">
        ${children}
      </main>
    </body>
  </html>
`;
}
  
