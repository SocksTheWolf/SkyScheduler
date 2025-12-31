import { Context } from "hono";
import { BaseLayout } from "../layout/main";
import { isUsingInviteKeys } from "../utils/inviteKeys";
import { MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits.d";
import NavTags from "../layout/navTags";
import isEmpty from "just-is-empty";
import AccountHandler from "../layout/account";
import { UsernameField } from "../layout/usernameField";
import { TurnstileCaptcha, TurnstileCaptchaPreloads } from "../layout/turnstile";
import FooterCopyright from "../layout/footer";
import { BSkyAppPasswordField, DashboardPasswordField } from "../layout/passwordFields";
import { PWAutoCompleteSettings } from "../types.d";

export default function Signup(props:any) {
  const ctx: Context = props.c;
  const linkToInvites = isUsingInviteKeys(ctx) && !isEmpty(ctx.env.INVITE_THREAD) ? 
    (<a href={ctx.env.INVITE_THREAD} target="_blank">Invite codes are routinely posted in this thread, grab one here</a>) : 
    "You can ask for the maintainer for it";

  return (
    <BaseLayout title="SkyScheduler - Signup" 
      preloads={[...TurnstileCaptchaPreloads(ctx)]}>
      <NavTags />
      <AccountHandler title="Create an Account" 
        submitText="Sign Up!"
        loadingText="Signing up..." 
        endpoint="/account/signup" 
        successText="Success! Redirecting to login..." 
        redirect="/login"
        footerHTML={<FooterCopyright />}>

        <UsernameField />

        <label hx-history="false">
          Dashboard Password
          <DashboardPasswordField autocomplete={PWAutoCompleteSettings.NewPass} required={true} />
          <small>Create a new password to use to login to this website. Passwords should be {MIN_DASHBOARD_PASS} to {MAX_DASHBOARD_PASS} characters long.</small>
        </label>

        <label>
          Bluesky App Password
          <BSkyAppPasswordField required={true} />
          <small>
            If you need a bluesky app password for your account, <a target="_blank" href="https://bsky.app/settings/app-passwords">you can get one here</a>.
          </small>
        </label>

        {isUsingInviteKeys(ctx) ? (
          <label>
            Invite Key/Signup Token
            <input type="text" name="signupToken" placeholder="" required />
            <small>This is an invite key to try to dissuade bots/automated applications. {linkToInvites}.</small>
          </label>
        ) : ''}

          <fieldset>
            <label>Agree to Terms</label>
            <input type="checkbox" name="agreeTerms" />
            Check the box if you agree to our <a href="/privacy" class="secondary" target="_blank" title="link to privacy policy">privacy policy
            </a> and <a href="/tos" class="secondary" target="_blank" title="link to terms of service">terms of service</a>.
          </fieldset>
        <br />
        <TurnstileCaptcha c={ctx} />
      </AccountHandler>
    </BaseLayout>
  );
}