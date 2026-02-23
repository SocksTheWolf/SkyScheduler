import AccountHandler from "../layout/account";
import NavTags from "../layout/helpers/navTags";
import { BaseLayout } from "../layout/main";
import { MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits";
import { APP_NAME } from "../siteinfo";

export default function ResetPassword() {
  const links = [{title: "Forgot Password", url: "/forgot"}];
  return (
    <BaseLayout title="Reset Password" noIndex={true}>
      <NavTags />
      <AccountHandler title="Reset Password"
        loadingText="Resetting Password..."
        endpoint="/account/reset"
        successText="Success! Redirecting to login..."
        redirect="/login"
        footerLinks={links}>

        <input type="hidden" name="resetToken" id="resetToken" hx-history="false" />

        <label>
          New {APP_NAME} Password
          <input type="password" name="password" id="password" minlength={MIN_DASHBOARD_PASS} maxlength={MAX_DASHBOARD_PASS} required />
          <small>Passwords should be {MIN_DASHBOARD_PASS} to {MAX_DASHBOARD_PASS} characters long.</small>
        </label>

        <label>
          Confirm {APP_NAME} Password
          <input type="password" name="confirmPassword" id="confirmPassword" minlength={MIN_DASHBOARD_PASS} maxlength={MAX_DASHBOARD_PASS} required />
        </label>
      </AccountHandler>
      <script type="text/javascript" src="js/reset.js"></script>
    </BaseLayout>
  );
}