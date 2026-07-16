import { PWAutoCompleteSettings } from "../enums";
import AccountHandler from "../layout/account";
import DashboardPasswordField from "../layout/fields/dashPasswordField";
import UsernameField from "../layout/fields/usernameField";
import NavTags from "../layout/helpers/navTags";
import { BaseLayout } from "../layout/main";
import { APP_NAME } from "../siteinfo";
import type { BaseElementProps } from "../types";

export default function Login(props?: BaseElementProps) {
  const links = [{title: "Sign Up", url: "/signup"}, {title: "Forgot Password", url: "/forgot"}];
  const curNonce = props?.ctx?.get("secureHeadersNonce");
  return (<BaseLayout title="Login" nonce={curNonce} preloads={[{type: "font", "href": "/fonts/LiberationMono.woff2"}]}>
    <NavTags />
    <AccountHandler title="Login"
      loadingText="Logging in..."
      footerLinks={links}
      nonce={curNonce}
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
  </BaseLayout>);
}