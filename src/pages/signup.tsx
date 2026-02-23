import { Context } from "hono";
import AccountHandler from "../layout/account";
import FooterCopyright from "../layout/helpers/footer";
import NavTags from "../layout/helpers/navTags";
import { TurnstileCaptcha, TurnstileCaptchaPreloads } from "../layout/helpers/turnstile";
import { BaseLayout } from "../layout/main";
import { BSkyAppPasswordField, DashboardPasswordField } from "../layout/passwordFields";
import { UsernameField } from "../layout/usernameField";
import { MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits";
import { APP_NAME } from "../siteinfo";
import { PWAutoCompleteSettings } from "../types";
import { getInviteThread, isUsingInviteKeys } from "../utils/inviteKeys";

export default function Signup(props:any) {
  const ctx: Context = props.c;
  const linkToInvites = isUsingInviteKeys(ctx) ?
    (<a href={getInviteThread(ctx)} target="_blank">Invite codes are routinely posted in this thread, grab one here</a>) :
    "You can ask for the maintainer for it";

  return (
    <BaseLayout title="Signup"
      preloads={[...TurnstileCaptchaPreloads(ctx)]}>
      <NavTags />
      <AccountHandler title="Create Account"
        submitText="Sign Up!"
        loadingText="Signing up..."
        endpoint="/account/signup"
        successText="Success! Redirecting to login..."
        redirect="/login"
        footerHTML={<FooterCopyright />}>

        <UsernameField />

        <label hx-history="false">
          {APP_NAME} Dashboard Password
          <DashboardPasswordField autocomplete={PWAutoCompleteSettings.NewPass} required={true} />
          <small>Create a new password to use to login to {APP_NAME}. Passwords should be {MIN_DASHBOARD_PASS} to {MAX_DASHBOARD_PASS} characters long.</small>
        </label>

        <label>
          Bluesky App Password
          <BSkyAppPasswordField required={true} />
          <small>
            If you need a BlueSky app password for your account, <a target="_blank" href="https://bsky.app/settings/app-passwords">you can get one here</a>.<br />
            If you use a separate PDS, you can change that in "Account Settings" on your dashboard, the site will attempt to infer your PDS for you.
          </small>
        </label>

        {isUsingInviteKeys(ctx) ? (
          <label>
            {APP_NAME} Invite Key/Signup Token
            <input type="text" name="signupToken" placeholder="" required />
            <small>This is an invite key to try to dissuade bots/automated applications. {linkToInvites}.</small>
          </label>
        ) : ''}

        <hr />
        <fieldset>
          <legend><label for="agreeTerms">Agree to {APP_NAME} Terms</label></legend>
          <input id="agreeTerms" type="checkbox" name="agreeTerms" />
          Check the box if you agree to {APP_NAME}'s <a href="/privacy" class="secondary" target="_blank" title="link to privacy policy">privacy policy
          </a> and <a href="/tos" class="secondary" target="_blank" title="link to terms of service">terms of service</a>.
        </fieldset>
        <br />
        <TurnstileCaptcha c={ctx} />
      </AccountHandler>
    </BaseLayout>
  );
}