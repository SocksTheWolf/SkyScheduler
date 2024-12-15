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
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 h-screen">
        <div class="h-screen overflow-y-auto hidden sm:flex flex-col px-4 py-6">
          <h1 class="text-lg font-bold">MySky manager</h1>
          <p class="text-sm">Schedule Bluesky posts effortlessly.</p>
          <br />
          <div id="posts" class="flex flex-col gap-4 flex-1 px-1">

          </div>

          <div>
            <a href="/logout" class="btn btn-accent btn-outline btn-sm w-full">Logout</a>
          </div>
        </div>
        <div class="h-screen overflow-y-auto md:col-span-2 lg:col-span-3">
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
              <p class="text-gray-800">\${post.content}</p>
              <p class="text-sm text-gray-500 mt-1">Scheduled for: \${formatDate(post.scheduledDate)}</p>
            </div>
          \`).join('');
          }

          // Load posts on page load
          loadPosts();
        </script>
      `}
    </BaseLayout>
  );
}