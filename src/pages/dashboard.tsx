import { Context } from "hono";
import PostCreation from "../layout/makePost";
import { BaseLayout } from "../layout";
import { ScheduledPostList } from "../layout/postList";

export default function Dashboard(props:any) {
  const ctx: Context = props.c;

  return (
    <BaseLayout title="Dashboard - SkyScheduler">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 h-screen">
        <div class="h-screen hidden sm:flex flex-col px-4 py-6">
          <h1 class="text-lg font-bold">SkyScheduler manager</h1>
          <p class="text-sm">Schedule Bluesky posts effortlessly.</p>
          <button id="refresh-posts" hx-get="/refresh" hx-target="#posts" hx-swap="innerHTML" hx-trigger="click">Refresh Posts</button>
          <br />
          <div id="posts" class="flex flex-col gap-4 flex-1 px-1 pb-2 overflow-y-auto">
            <ScheduledPostList ctx={ctx} />
          </div>

          <div>
            <a href="/logout" class="btn btn-accent btn-outline btn-sm w-full">Logout</a>
          </div>
        </div>
        <div class="h-screen md:col-span-2 lg:col-span-3">
          <PostCreation />
        </div>
      </div>
    </BaseLayout>
  );
}