import { Context } from "hono";
import { BaseLayout } from "../layout/main";
import { isUsingInviteKeys } from "../utils/inviteKeys";
import { BSKY_MAX_APP_PASSWORD_LENGTH, MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits.d";
import NavTags from "../layout/navTags";
import isEmpty from "just-is-empty";
import AccountHandler from "../layout/account";
import UsernameField from "../layout/usernameField";
import TurnstileCaptcha from "../layout/turnstile";

export default function Signup(props:any) {
  const ctx: Context = props.c;
  const linkToInvites = isUsingInviteKeys(ctx) && !isEmpty(ctx.env.INVITE_THREAD) ? 
    (<a href={ctx.env.INVITE_THREAD} target="_blank">You can check for invite codes in this thread</a>) : 
    "You can ask for the maintainer for it";

  return (
    <BaseLayout title="SkyScheduler - Signup">
      <NavTags />
      <AccountHandler title="Create an Account" 
        submitText="Sign Up!"
        loadingText="Signing up..." 
        endpoint="/account/signup" 
        successText="Success! Redirecting to login..." 
        redirect="/login">

        <label>
          Dashboard Password
          <input type="password" name="password" minlength={MIN_DASHBOARD_PASS} maxlength={MAX_DASHBOARD_PASS} required />
          <small>Create a new password to use to login to this website. Passwords should be {MIN_DASHBOARD_PASS} to {MAX_DASHBOARD_PASS} characters long.</small>
        </label>

        <UsernameField />
        
        <label>
          Bluesky App Password
          <input type="password" name="bskyAppPassword" maxlength={BSKY_MAX_APP_PASSWORD_LENGTH} placeholder="" required />
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

        <TurnstileCaptcha c={ctx} />
      </AccountHandler>
    </BaseLayout>
  );
}