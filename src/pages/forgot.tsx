import { Context } from "hono";
import { html } from "hono/html";
import { BaseLayout } from "../layout/main";
import { BSKY_MIN_USERNAME_LENGTH } from "../limits.d";
import ProcessAccountForm from "../layout/accountForm";
import NavTags from "../layout/navTags";
import UsernameHelper from "../layout/usernameHelper";

export default function ForgotPassword(props:any) {
  const ctx: Context = props.c;
  return (
    <BaseLayout title="SkyScheduler - Forgot Password">
      <NavTags />
      <section class="container">
        <article>
          <header>
            <center><h3>Forgot Password Reset</h3></center>
          </header>
          <center><p>You will recieve a Direct Message from <code>@{ctx.env.RESET_BOT_USERNAME}</code> on Bluesky with a link to reset your password.</p></center>
          <form id="loginForm">
            <label>
              Bluesky Handle
              <input type="text" id="username" name="username" minlength={BSKY_MIN_USERNAME_LENGTH} required />
              <small>This is your bsky username, in the format of a domain like <code>USERNAME.bsky.social</code>.</small>
            </label>

            {ctx.env.USE_TURNSTILE_CAPTCHA ? (
              <label>
                <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
                Captcha
                <div class="cf-turnstile" data-sitekey={ctx.env.TURNSTILE_PUBLIC_KEY}></div>
              </label>
            ) : ''}

            <center>
              <button type="submit" id="submitSignup">
                Request Reset
              </button>
            </center>
          </form>
          <ProcessAccountForm text="Requesting Password Reset..." />
        </article>
      </section>
      <script type="text/javascript">
      {html`
        easySetup("/account/forgot", "Success! Check your bsky dms for info. Redirecting to home..", "/");
      `}
      </script>
      <UsernameHelper />
    </BaseLayout>
  );
}