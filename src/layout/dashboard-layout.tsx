import { Child } from "hono/jsx";
import { BaseLayout } from "../layout";
import { html } from "hono/html";
import { ScheduledPostList } from "./postList";
import { Context } from "hono";

type DashboardLayoutProps = {
  children: Child;
  ctx?: Context;
  title?: string;
};

export default function DashboardLayout({
  ctx,
  children,
  title = "Dashboard - SkyScheduler",
}: DashboardLayoutProps) {
  return (
    <BaseLayout title={title}>
      <script src="https://unpkg.com/dropzone@6.0.0-beta.2/dist/dropzone-min.js"></script>
      <script src="https://unpkg.com/countable@3.0.1/Countable.min.js"></script>
      <link href="https://unpkg.com/dropzone@6.0.0-beta.2/dist/dropzone.css" rel="stylesheet" type="text/css" />
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 h-screen">
        <div class="h-screen hidden sm:flex flex-col px-4 py-6">
          <h1 class="text-lg font-bold">SkyScheduler manager</h1>
          <p class="text-sm">Schedule Bluesky posts effortlessly.</p>
          <br />
          <div id="posts" class="flex flex-col gap-4 flex-1 px-1 pb-2 overflow-y-auto">
            <ScheduledPostList ctx={ctx} />
          </div>

          <div>
            <a href="/logout" class="btn btn-accent btn-outline btn-sm w-full">Logout</a>
          </div>
        </div>
        <div class="h-screen md:col-span-2 lg:col-span-3">
          {children}
        </div>
      </div>
    </BaseLayout>
  );
}