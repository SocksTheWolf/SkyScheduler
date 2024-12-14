import { html } from 'hono/html';
import { Child } from 'hono/jsx';
import { css } from '../css';

type BaseLayoutProps = {
  children: Child;
  title?: string;
};

export const BaseLayout = ({
  children,
  title = "Social Media Scheduler"
}: BaseLayoutProps) => html`
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>

      <style>
        ${css}
      </style>
    </head>
    <body class="bg-neutral-content min-h-screen">
      ${children}
    </body>
  </html>
`;
