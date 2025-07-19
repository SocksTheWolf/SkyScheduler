import { html } from "hono/html";
import { BaseLayout } from "../layout/main";
import NavTags from "../layout/navTags";
import { MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits.d";
import AccountHandler from "../layout/account";

export default function ResetPassword() {
  const links = [{title: "Forgot Password", url: "/forgot"}];
  return (
    <BaseLayout title="SkyScheduler - Reset Password">
      <NavTags />
      <AccountHandler title="Reset Password" 
        loadingText="Resetting Password..." 
        endpoint="/account/reset" 
        successText="Success! Redirecting to login..." 
        redirect="/login" 
        footerLinks={links}>

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
      </AccountHandler>
      <script type="text/javascript">
      {html`
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