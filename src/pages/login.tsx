import { html } from "hono/html";
import { BaseLayout } from "../layout/main";
import ProcessAccountForm from "../layout/accountForm";
import NavTags from "../layout/navTags";
import UsernameHelper from "../layout/usernameHelper";

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
              <input type="text" name="username" id="username" required />
              <small>In the format of a custom domain or <code>socksthewolf.bsky.social</code></small>
            </label>

            <label>
              Dashboard Password
              <input type="password" name="password" id="password" required />
              <small><b>NOTE</b>: This password is not related to your bluesky account!</small>
            </label>
            <center>
              <button type="submit">
                Login
              </button>
            </center>
          </form>
          <ProcessAccountForm text="Logging in..." />
          <footer>
            <center>
              <small><a class="contrast outline" href="/signup">Sign Up</a> | <a class="contrast outline" href="/forgot">Forgot Password</a></small>
            </center>
          </footer>
        </article>
      </section>
      <script type="text/javascript">
      {html`
        easySetup("/account/login", "Success! Redirecting to dashboard...", "/dashboard");
      `}
      </script>
      <UsernameHelper />
    </BaseLayout>
  );
}