import { html } from "hono/html";
import { BaseLayout } from "../layout/main";
import NavTags from "../layout/navTags";
import AccountHandler from "../layout/account";
import UsernameField from "../layout/usernameField";

export default function Login() {
  const links = [{title: "Sign Up", url: "/signup"}, {title: "Forgot Password", url: "/forgot"}];
  return (
    <BaseLayout title="SkyScheduler - Login">
      <NavTags />
      <AccountHandler title="Login" loadingText="Logging in..." 
        footerLinks={links}
        endpoint="/account/login" 
        successText="Success! Redirecting to dashboard..." 
        redirect="/dashboard">

        <UsernameField />

        <label>
          Dashboard Password
          <input type="password" name="password" id="password" required />
          <small><b>NOTE</b>: This password is not related to your bluesky account!</small>
        </label>
      </AccountHandler>
    </BaseLayout>
  );
}