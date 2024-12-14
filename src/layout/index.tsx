import { html } from 'hono/html';
import { Child } from 'hono/jsx';

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
      <title>${title}</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
      ${children}
    </body>
  </html>
`;
