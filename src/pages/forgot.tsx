import { Context } from "hono";
import AccountHandler from "../layout/account";
import FooterCopyright from "../layout/helpers/footer";
import NavTags from "../layout/helpers/navTags";
import { TurnstileCaptcha, TurnstileCaptchaPreloads } from "../layout/helpers/turnstile";
import { BaseLayout } from "../layout/main";
import { UsernameField } from "../layout/usernameField";
import { APP_NAME } from "../siteinfo";

export default function ForgotPassword(props:any) {
  const ctx: Context = props.c;
  const botAccountURL: string = `https://bsky.app/profile/${ctx.env.RESET_BOT_USERNAME}`;
  return (
    <BaseLayout title="Forgot Password"
      preloads={[...TurnstileCaptchaPreloads(ctx)]}>
      <NavTags />
      <AccountHandler title="Forgot Password Reset"
        submitText="Request Password Reset"
        loadingText="Requesting Password Reset..." endpoint="/account/forgot"
        successText="Attempted to send DM. If you do not have it, please make sure you are following the account."
        redirect="/login"
        customRedirectDelay={2000}
        footerHTML={<FooterCopyright />}>

        <center hx-history="false">
          <p>You will receive a <a target="_blank" href="https://bsky.app/messages">Direct Message</a> from <code>@{ctx.env.RESET_BOT_USERNAME}</code> on BSky/PDS with a link to reset your password.<br />
            If you encounter errors, your <a href="https://bsky.app/messages/settings" class="secondary" rel="nofollow" target="_blank">Direct Communication settings</a> might be set to forbid
            Direct Messages from accounts you don't follow.<br /><br />
            It is <u>heavily recommended</u> to <a href={botAccountURL} target="_blank">follow the service account</a>.<br /><br />
            <small><b>NOTE</b>: {APP_NAME} sends DMs via an one-way delivery method. No one (other than you) can see the account password reset URL.</small></p>
        </center>

        <UsernameField />

        <TurnstileCaptcha c={ctx} />
    </AccountHandler>
    </BaseLayout>
  );
}