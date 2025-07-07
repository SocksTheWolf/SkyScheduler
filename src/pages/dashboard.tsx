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
          <button id="refresh-posts" class="btn btn-info btn-outline btn-med" hx-get="/posts" hx-target="#posts" hx-swap="innerHTML" hx-trigger="click">
            <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 3V8M3 8H8M3 8L6 5.29168C7.59227 3.86656 9.69494 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.71683 21 4.13247 18.008 3.22302 14" stroke="#ffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
            Refresh Posts
          </button>
          <h3 class="font-weight-light pb-2 pt-3 text-lg">Post List:</h3>
          <hr class="border border-primary mt-1" />
          <div id="posts" class="flex flex-col gap-4 flex-1 px-1 pb-2 pt-2 overflow-y-auto">
            <ScheduledPostList ctx={ctx} />
          </div>

          <div class="pt-2">
            <button class="btn btn-error btn-outline btn-sm w-full " hx-post="/logout" hx-target="body" hx-swap="innerHTML">
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