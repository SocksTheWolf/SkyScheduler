import { html } from "hono/html";
import { BaseLayout } from "../layout";

export default function Signup() {
  return (
    <BaseLayout title="Signup - SkyScheduler">
      <div class="grid place-items-center min-h-screen">
        <div class="card shadow-2xl bg-white dark:bg-gray-900 p-8">
          <h1 class="text-2xl font-bold mb-6 text-center">Account Signup</h1>
          <form id="loginForm" class="space-y-4">

            <label class="input input-bordered flex items-center gap-2 mb-4">
              Dashboard Password
              <input type="password" name="password" class="grow" placeholder="" required />
            </label>

            <label class="input input-bordered flex items-center gap-2 mb-4">
              Bluesky Handle
              <input type="text" name="username" class="grow" placeholder="" required />
            </label>

            <label class="input input-bordered flex items-center gap-2 mb-4">
              App Password
              <input type="password" name="bskyAppPassword" class="grow" placeholder="" required />
            </label>

            <label class="input input-bordered flex items-center gap-2 mb-4">
              Invite Key
              <input type="text" name="signupToken" class="grow" placeholder="" required />
            </label>

            <button type="submit" class="w-full btn btn-primary btn-lg">
              Sign Up
            </button>
            <br />
            <center class="mt-2"><a href="/">Go Back</a></center>
          </form>
        </div>
      </div>

      <script>
        {html`
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          let postObject = {};
          document.querySelectorAll("input").forEach((el) => {
            postObject[el.name] = el.value;
          });
          try {
            const response = await fetch('/signup', {
              method: 'POST',
              headers: {'Content-Type': 'application/json' },
              body: JSON.stringify(postObject)
            });

            const data = await response.json();
            if (response.ok)
              window.location.href = '/';
            else
              pushToast(data.msg, false);

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