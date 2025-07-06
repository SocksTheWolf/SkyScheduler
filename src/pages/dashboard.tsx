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
          <p class="text-sm pb-3">Schedule Bluesky posts effortlessly.</p>
          <button id="refresh-posts" class="btn btn-info btn-outline btn-sm" hx-get="/posts" hx-target="#posts" hx-swap="innerHTML" hx-trigger="click">Refresh Posts</button>
          <p class="font-weight-light pb-2 pt-3">Post List:</p>
          <hr class="border border-primary mt-1" />
          <div id="posts" class="flex flex-col gap-4 flex-1 px-1 pb-2 pt-2 overflow-y-auto">
            <ScheduledPostList ctx={ctx} />
          </div>

          <div>
            <button class="btn btn-accent btn-outline btn-sm w-full" hx-post="/logout" hx-target="body" hx-swap="innerHTML">
              Logout
            </button>
          </div>
        </div>
        <div class="h-screen md:col-span-2 lg:col-span-3">
          <PostCreation />
        </div>
      </div>
    </BaseLayout>
  );
}