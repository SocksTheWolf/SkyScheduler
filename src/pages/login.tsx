import AccountHandler from "../layout/account";
import { BaseLayout } from "../layout/main";
import NavTags from "../layout/navTags";
import { DashboardPasswordField } from "../layout/passwordFields";
import { UsernameField } from "../layout/usernameField";
import { PWAutoCompleteSettings } from "../types.d";

export default function Login() {
  const links = [{title: "Sign Up", url: "/signup"}, {title: "Forgot Password", url: "/forgot"}];
  return (
    <BaseLayout title="SkyScheduler - Login">
      <NavTags />
      <AccountHandler title="Login"
        loadingText="Logging in..."
        footerLinks={links}
        endpoint="/account/login"
        successText="Success! Redirecting to dashboard..."
        redirect="/dashboard">

        <UsernameField />

        <label hx-history="false">
          Dashboard Password
          <DashboardPasswordField autocomplete={PWAutoCompleteSettings.CurrentPass} required={true} />
          <small><b>NOTE</b>: This password is not related to your Bluesky account!</small>
        </label>
      </AccountHandler>
    </BaseLayout>
  );
}