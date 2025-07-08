import { Context } from "hono";
import { html } from "hono/html";
import { BaseLayout } from "../layout/main";
import { BSKY_MAX_APP_PASSWORD_LENGTH, BSKY_MIN_USERNAME_LENGTH, MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits.d";

export default function Signup(props:any) {
  const ctx: Context = props.c;
  return (
    <BaseLayout title="Signup - SkyScheduler">
      <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
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
              <small>Create a new password unrelated with bluesky to use to login to this website</small>
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

            <label>
              Captcha
              <div class="cf-turnstile" data-sitekey={ctx.env.TURNSTILE_PUBLIC_KEY} data-callback="enableSubmit"></div>
            </label>
            <button type="submit" id="submitSignup" class="w-full" disabled>
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
        function enableSubmit() {
          document.getElementById("submitSignup").disabled = false;
        }
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