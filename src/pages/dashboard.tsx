import { html } from "hono/html";
import DashboardLayout from "../layout/dashboard-layout";

export default function Homepage() {
  return (
    <DashboardLayout title="Dashboard - Social Media Scheduler">
      <div class="p-6 border rounded-xl bg-white my-4 mx-4 sm:ml-0 h-[calc(100vh-2rem)]">

        <form id="postForm" class="flex flex-col h-full overflow-y-auto">
          <h1 class="text-2xl font-bold mb-6">Schedule New Post</h1>
          <label class="form-control mb-4 flex-1 flex flex-col">
            <div class="label">
              <span class="label-text">Content</span>
            </div>
            <textarea id="content" class="textarea textarea-bordered h-24 flex-1" rows={4} required></textarea>
          </label>

          <div>
            <label class="input input-bordered flex items-center gap-2 mb-2">
              Schedule Date
              <input type="datetime-local" id="scheduledDate" class="grow" placeholder="" required />
            </label>
            <p class="text-sm mb-4 italic px-2 text-base-content">You can schedule posts in the future, hourly. Minutes are rounded down.</p>
          </div>

          <button type="submit" class="w-full btn btn-primary btn-outline">
            Schedule Post
          </button>
        </form>

        <div class="toast toast-bottom toast-end">
          <div id="error" class="alert alert-error text-sm text-white hidden">An error occurred</div>
          <div id="success" class="alert alert-success text-sm text-white hidden">Post scheduled successfully</div>
        </div>
      </div>

      <script>
        {html`
        // Handle form submission
        document.getElementById('postForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const content = document.getElementById('content').value;
          const scheduledDate = document.getElementById('scheduledDate').value;

          try {
            const response = await fetch('/posts', {
              method: 'POST',
              headers: {'Content-Type': 'application/json' },
              body: JSON.stringify({
                content,
                scheduledDate: new Date(scheduledDate).toISOString()
              })
            });
            const data = await response.json();

            if (response.ok) {
              document.getElementById('success').classList.remove('hidden');
              document.getElementById('error').classList.add('hidden');
              document.getElementById('postForm').reset();
              loadPosts();
            } else {
              document.getElementById('error').textContent = data.error?.message || data.error || 'An error occurred';
              document.getElementById('error').classList.remove('hidden');
              document.getElementById('success').classList.add('hidden');
            }
          } catch (err) {
            document.getElementById('error').classList.remove('hidden');
            document.getElementById('success').classList.add('hidden');
          }
        });

        // roundup minutes
        function roundMinutes(date) {
          const minutes = date.getMinutes();
          const roundedMinutes = Math.ceil(minutes / 60) * 60;
          date.setMinutes(roundedMinutes);
          return date.toISOString().slice(0,16);
        }

        document.getElementById('scheduledDate').addEventListener('change', (e) => {
          const date = new Date(e.target.value);
          e.target.value = roundMinutes(date);
        });

        `}
      </script>
    </DashboardLayout>
  );
}