import { html } from 'hono/html';
import { Child } from 'hono/jsx';
import { css } from '../css';

type BaseLayoutProps = {
  children: Child;
  title?: string;
};

export const BaseLayout = ({
  children,
  title = "SkyScheduler"
}: BaseLayoutProps) => html`
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.6/dist/htmx.min.js"></script>
      <title>${title}</title>

      <style>
        ${css}
      </style>
      <style>
      .dz-size, .dz-filename {
        display: block !important;
      }

      .dz-preview {
        width: 100%;
        grid-row: 1;
      }

      .dz-preview div {
        display: inline-block;
        position: relative;
      }

      .dz-preview div svg {
        display: none !important;
      }

      .dz-preview button {
        display: inline-block;
      }

      #imageUploads {
        display: grid;
        grid-template-columns: 20% 20% 20% 20%;
        grid-template-rows: 1fr 1fr;
        grid-auto-columns: 100%;
      }

      #imgArea {
        z-index: 10;
      }

      .tooLong {
        color: red;
      }
      </style>
    </head>
    <body class="bg-neutral-content min-h-screen">
      ${children}
    </body>
  </html>
`;
