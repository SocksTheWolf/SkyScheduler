import { html } from "hono/html";
import { BaseLayout } from "../layout";

export default function Home() {
  return (
    <BaseLayout title="Login - SkyScheduler">
      <br /><br />
      <section class="container">
        <article>
          <header>
            <center><h2>Login to portal</h2></center>
          </header>
          <form id="loginForm">
            <label>
              Bluesky Handle
              <input type="text" id="username" placeholder="" />
              <small>In the format of a custom domain or <code>socksthewolf.bsky.social</code></small>
            </label>

            <label>
              Dashboard Password
              <input type="password" id="password" placeholder="" />
              <small><b>NOTE</b>: This is not a bsky app password!</small>
            </label>

            <button type="submit" class="w-full">
              Login
            </button>
          </form>
          <footer>
            <center>
              <a href="/signup" class="contrast outline">Sign-up</a>
            </center>
          </footer>
        </article>
      </section>
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