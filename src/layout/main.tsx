import { html } from 'hono/html';
import { Child } from 'hono/jsx';
import MetaTags from './metaTags';

type BaseLayoutProps = {
  children: Child;
  title?: string;
};

export const BaseLayout = ({
  children,
  title = "SkyScheduler"
}: BaseLayoutProps) => html`
  <!DOCTYPE html>
  <html data-theme="dark">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="stylesheet" type="text/css" href="/dep/toastify.min.css"></link>
      <script src="/dep/htmx.min.js"></script>
      <script type="text/javascript" src="/dep/toastify.js"></script>
      <link
        rel="stylesheet"
        href="/dep/pico.min.css">
      <link
        rel="stylesheet"
        href="/stylesheet.css">
      <script type="text/javascript" src="/main.js"></script>
      <title>${title}</title>
      ${<MetaTags />}
    </head>
    <body>
      <main>
        ${children}
      </main>
    </body>
  </html>
`;
