import { html } from "hono/html";
import { BaseLayout } from "../layout/main";
import ProcessAccountForm from "../layout/accountForm";
import NavTags from "../layout/navTags";
import { MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits.d";

export default function ResetPassword() {
  return (
    <BaseLayout title="SkyScheduler - Reset Password">
      <NavTags />
      <section class="container">
        <article>
          <header>
            <center><h3>Reset Password</h3></center>
          </header>
          <form id="loginForm">
            <input type="hidden" name="resetToken" id="resetToken" />

            <label>
              New Password
              <input type="password" name="password" id="password" minlength={MIN_DASHBOARD_PASS} maxlength={MAX_DASHBOARD_PASS} required />
              <small>Passwords should be {MIN_DASHBOARD_PASS} to {MAX_DASHBOARD_PASS} characters long.</small>
            </label>

            <label>
              Confirm Password
              <input type="password" name="confirmPassword" id="confirmPassword" minlength={MIN_DASHBOARD_PASS} maxlength={MAX_DASHBOARD_PASS} required />
            </label>

            <center>
              <button type="submit" id="submitButton" disabled>
                Reset Password
              </button>
            </center>
          </form>
          <ProcessAccountForm text="Resetting Password..." />
          <footer>
            <center>
              <small><a href="/forgot" class="secondary outline">Request a password reset</a></small>
            </center>
          </footer>
        </article>
      </section>
      <script type="text/javascript">
      {html`
        easySetup("/account/reset", "Success! Redirecting to login...", "/login");
        if (resetToken = new URLSearchParams(window.location.search).get("token")) {
          document.getElementById("resetToken").value = encodeURI(resetToken);
          const submitButton = document.getElementById("submitButton");
          submitButton.removeAttribute("disabled");
        } else {
          pushToast("Reset token is invalid! Request a new reset token to continue", false);
        }
      `}
      </script>
    </BaseLayout>
  );
}