import { html } from "hono/html";
import { BaseLayout } from "../layout/main";
import { BSKY_MAX_APP_PASSWORD_LENGTH, BSKY_MIN_USERNAME_LENGTH, MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits.d";

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
              <input type="password" name="password" placeholder="" minlength={MIN_DASHBOARD_PASS} maxlength={MAX_DASHBOARD_PASS} required />
              <small>This is not your bsky app password, but a new password you'll use to login to the tool. <b>DO NOT LOSE THIS PASSWORD, IT CANNOT BE CHANGED.</b></small>
            </label>

            <label>
              Bluesky Handle
              <input type="text" name="username" minlength={BSKY_MIN_USERNAME_LENGTH} placeholder="" required />
              <small>This is your bsky username, like <code>socksthewolf.bsky.social</code></small>
            </label>

            <label>
              App Password
              <input type="password" name="bskyAppPassword" maxlength={BSKY_MAX_APP_PASSWORD_LENGTH} placeholder="" required />
              <small>If you need an app password, <a target="_blank" href="https://bsky.app/settings/app-passwords">you can get one here</a></small>
            </label>

            <label>
              Invite Key
              <input type="text" name="signupToken" placeholder="" required />
              <small>This is an invite key to try to dissuade bots. You can ask for the maintainer's signup token</small>
            </label>

            <button type="submit" class="w-full">
              Sign Up
            </button>
          </form>
          <footer>
            <center>
              <small>
                <a class="contrast outline" href="/">Go Back</a>
              </small>
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