import { html } from "hono/html";
import { BaseLayout } from "../layout/main";
import ProcessAccountForm from "../layout/accountForm";
import NavTags from "../layout/navTags";

export default function Login() {
  return (
    <BaseLayout title="SkyScheduler - Login">
      <NavTags />
      <section class="container">
        <article>
          <header>
            <center><h3>Login</h3></center>
          </header>
          <form id="loginForm">
            <label>
              Bluesky Handle
              <input type="text" name="username" id="username" placeholder="" required />
              <small>In the format of a custom domain or <code>socksthewolf.bsky.social</code></small>
            </label>

            <label>
              Dashboard Password
              <input type="password" name="password" id="password" placeholder="" required />
              <small><b>NOTE</b>: This password is not related to your bluesky account!</small>
            </label>
            <center>
              <button type="submit">
                Login
              </button>
            </center>
          </form>
          <p class="smallest"><b>Forgot your password?</b> Contact the project admin to get your password reset.<br />
              <em>Automated resets are coming soon!</em></p>
          <ProcessAccountForm text="Logging in..." />
          <footer>
            <center>
              <small>Don't have an account? <a href="/signup" class="contrast outline">Click here to Sign Up</a></small>
            </center>
          </footer>
        </article>
      </section>
      <script type="text/javascript">
      {html`
        easySetup("/account/login", "Success! Redirecting to dashboard...", "/dashboard");
      `}
      </script>
    </BaseLayout>
  );
}