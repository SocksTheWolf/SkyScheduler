import { html } from "hono/html";
import { BaseLayout } from "../layout";

export default function Signup() {
  return (
    <BaseLayout title="Signup - SkyScheduler">
      <br /><br />
      <section class="container">
        <article>
          <header>
            <center><h2>Account Signup</h2></center>
          </header>
          <form id="loginForm">
            <label>
              Dashboard Password
              <input type="password" name="password" placeholder="" required />
            </label>

            <label>
              Bluesky Handle
              <input type="text" name="username" placeholder="" required />
            </label>

            <label>
              App Password
              <input type="password" name="bskyAppPassword" placeholder="" required />
            </label>

            <label>
              Invite Key
              <input type="text" name="signupToken" placeholder="" required />
            </label>

            <button type="submit" class="w-full">
              Sign Up
            </button>
          </form>
          <footer>
            <center>
              <center>
                <a class="contrast outline" href="/">Go Back</a>
              </center>
            </center>
          </footer>
        </article>
      </section>
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