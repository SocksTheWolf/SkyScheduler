import { html } from "hono/html";
import { BaseLayout } from "../layout";

export default function Home() {
  return (
    <BaseLayout title="Login - SkyScheduler">
      <div class="grid place-items-center min-h-screen">
        <div class="card shadow-2xl bg-white dark:bg-gray-900 p-8">
          <h1 class="text-2xl font-bold mb-6 text-center">Login to portal</h1>
          <form id="loginForm" class="space-y-4">

            <label class="input input-bordered flex items-center gap-2 mb-4">
              Bluesky Handle
              <input type="text" id="username" class="grow" placeholder="" />
            </label>

            <label class="input input-bordered flex items-center gap-2 mb-4">
              Password
              <input type="password" id="password" class="grow" placeholder="" />
            </label>

            <button type="submit" class="w-full btn btn-primary btn-lg">
              Login
            </button>
          </form>
          <br />
          <div class="vstack mt-3">
            <center>
              <a href="/signup" class="btn btn-outline-info">Sign-up</a>
            </center>
          </div>
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
            if (response.ok)
              window.location.href = '/dashboard';
            else
              pushToast(data.message, false);

          } catch (err) {
            pushToast("An error occurred", false);
            console.error(err);
          }
        });
        `}
      </script>
    </BaseLayout>
  );
}