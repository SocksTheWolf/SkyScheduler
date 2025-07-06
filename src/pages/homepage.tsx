import { html } from "hono/html";
import { BaseLayout } from "../layout";

export default function Home() {
  return (
    <BaseLayout title="Login - SkyScheduler">
      <div class="grid place-items-center min-h-screen">
        <div class="card shadow-2xl bg-white p-8">
          <h1 class="text-2xl font-bold mb-6 text-center">Login to your portal</h1>
          <form id="loginForm" class="space-y-4">

            <label class="input input-bordered flex items-center gap-2 mb-4">
              Bluesky Handle
              <input type="text" id="username" class="grow" placeholder="" />
            </label>

            <label class="input input-bordered flex items-center gap-2 mb-4">
              Password
              <input type="password" id="password" class="grow" placeholder="" />
            </label>

            <button type="submit" class="w-full btn btn-primary">
              Login
            </button>
          </form>
          <div id="error" role="alert" class="alert alert-error mt-4 py-2 text-sm hidden"></div>
        </div>
      </div>

      <script>
        {html`
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const username = document.getElementById('username').value;
          const password = document.getElementById('password').value;
          try {
            const response = await fetch('/api/auth/sign-in/username', {
              method: 'POST',
              headers: {'Content-Type': 'application/json' },
              body: JSON.stringify({ "username": username, "password": password })
            });

            const data = await response.json();
            if (response.ok) {
              window.location.href = '/dashboard';
            } else {
              document.getElementById('error').textContent = data.message;
              document.getElementById('error').classList.remove('hidden');
            }
          } catch (err) {
            document.getElementById('error').textContent = 'An error occurred';
            console.error(err);
            document.getElementById('error').classList.remove('hidden');
          }
        });
        `}
      </script>
    </BaseLayout>
  );
}