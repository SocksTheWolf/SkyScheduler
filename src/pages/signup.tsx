import { Context } from "hono";
import { html } from "hono/html";
import { BaseLayout } from "../layout/main";
import { BSKY_MAX_APP_PASSWORD_LENGTH, BSKY_MIN_USERNAME_LENGTH, MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits.d";
import ProcessAccountForm from "../layout/accountForm";
import NavTags from "../layout/navTags";

export default function Signup(props:any) {
  const ctx: Context = props.c;
  return (
    <BaseLayout title="SkyScheduler - Signup">
      <NavTags />
      <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
      <section class="container">
        <article>
          <header>
            <center><h3>SkyScheduler Account Signup</h3></center>
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
            <center>
              <button type="submit" id="submitSignup" disabled>
                Sign Up
              </button>
            </center>
          </form>
          <ProcessAccountForm text="Signing up..." />
        </article>
      </section>
      <script>
      {html`
        function enableSubmit() {
          document.getElementById("submitSignup").disabled = false;
        }
        easySetup("/account/signup", "success! redirecting to login...", "/login");
      `}
      </script>
    </BaseLayout>
  );
}