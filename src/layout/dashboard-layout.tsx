import { Child } from "hono/jsx";
import { BaseLayout } from "../layout";
import { html } from "hono/html";


type DashboardLayoutProps = {
  children: Child;
  title?: string;
};

export default function DashboardLayout({
  children,
  title = "Dashboard - Social Media Scheduler",
}: DashboardLayoutProps) {
  return (
    <BaseLayout title={title}>
      <script src="https://unpkg.com/dropzone@6.0.0-beta.2/dist/dropzone-min.js"></script>
      <link href="https://unpkg.com/dropzone@6.0.0-beta.2/dist/dropzone.css" rel="stylesheet" type="text/css" />
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 h-screen">
        <div class="h-screen hidden sm:flex flex-col px-4 py-6">
          <h1 class="text-lg font-bold">MySky manager</h1>
          <p class="text-sm">Schedule Bluesky posts effortlessly.</p>
          <br />
          <div id="posts" class="flex flex-col gap-4 flex-1 px-1 pb-2 overflow-y-auto">

          </div>

          <div>
            <a href="/logout" class="btn btn-accent btn-outline btn-sm w-full">Logout</a>
          </div>
        </div>
        <div class="h-screen md:col-span-2 lg:col-span-3">
          {children}
        </div>
      </div>

      {html`
        <script>
        // Format date for display
        function formatDate(date) {
          return new Date(date).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
          });
        }
        // Load posts
        async function loadPosts() {
          const response = await fetch('/posts');
          const posts = await response.json();
          const postsContainer = document.getElementById('posts');
            postsContainer.innerHTML = posts.map(post => \`
              <div class="border border-gray-200 rounded px-3 py-2 bg-white">
                <div class="flex gap-2 items-center">
                  <p class="text-gray-800 flex-1 truncate">\${post.content}</p>
                  \${post.posted ? '' : \`<form action="/posts/\${post.id}/delete" method="POST">
                    <button type="submit" class="btn btn-sm btn-error btn-outline px-1 py-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" class="size-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </form>\`}
                </div>
                <p class="text-sm text-gray-500 mt-1">\${post.posted ? 'Posted on:' : 'Scheduled for:'} \${formatDate(post.scheduledDate)}</p>
              </div>
            \`).join('');

            if(posts.length === 0) {
              postsContainer.innerHTML = \`
                <div class="border border-gray-200 rounded px-3 py-2 bg-white">
                  <p class="text-gray-800">No posts scheduled</p>
                </div>
              \`;
            }
          }

          // Load posts on page load
          loadPosts();
        </script>
      `}
    </BaseLayout>
  );
}