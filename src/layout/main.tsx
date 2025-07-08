import { html } from 'hono/html';
import { Child } from 'hono/jsx';

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
      <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css"></link>
      <script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.6/dist/htmx.min.js"></script>
      <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/toastify-js"></script>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
      <link
        rel="stylesheet"
        href="/stylesheet.css">
      <script type="text/javascript" src="/main.js"></script>
      <title>${title}</title>
    </head>
    <body>
      <main>
        ${children}
      </main>
    </body>
  </html>
`;
