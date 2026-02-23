import AccountHandler from "../layout/account";
import NavTags from "../layout/helpers/navTags";
import { BaseLayout } from "../layout/main";
import { DashboardPasswordField } from "../layout/passwordFields";
import { UsernameField } from "../layout/usernameField";
import { APP_NAME } from "../siteinfo";
import { PWAutoCompleteSettings } from "../types";

export default function Login() {
  const links = [{title: "Sign Up", url: "/signup"}, {title: "Forgot Password", url: "/forgot"}];
  return (
    <BaseLayout title="Login">
      <NavTags />
      <AccountHandler title="Login"
        loadingText="Logging in..."
        footerLinks={links}
        endpoint="/account/login"
        successText="Success! Redirecting to dashboard..."
        redirect="/dashboard">

        <UsernameField />

        <label hx-history="false">
          {APP_NAME} Dashboard Password
          <DashboardPasswordField autocomplete={PWAutoCompleteSettings.CurrentPass} required={true} />
          <small><b>NOTE</b>: This password is not related to your Bluesky account!</small>
        </label>
      </AccountHandler>
    </BaseLayout>
  );
}