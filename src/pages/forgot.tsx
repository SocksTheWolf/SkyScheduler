import { Context } from "hono";
import { BaseLayout } from "../layout/main";
import NavTags from "../layout/navTags";
import AccountHandler from "../layout/account";
import { UsernameField } from "../layout/usernameField";
import { TurnstileCaptcha, TurnstileCaptchaPreloads } from "../layout/turnstile";
import FooterCopyright from "../layout/footer";

export default function ForgotPassword(props:any) {
  const ctx: Context = props.c;
  const botAccountURL:string = `https://bsky.app/profile/${ctx.env.RESET_BOT_USERNAME}`;
  return (
    <BaseLayout title="SkyScheduler - Forgot Password" 
      preloads={[...TurnstileCaptchaPreloads(ctx)]}>
      <NavTags />
      <AccountHandler title="Forgot Password Reset" 
        submitText="Request Password Reset"
        loadingText="Requesting Password Reset..." endpoint="/account/forgot" 
        successText="Success! Check your bsky dms for info. Redirecting to home.." 
        redirect="/"
        footerHTML={<FooterCopyright />}>

        <center hx-history="false">
          <p>You will receive a Direct Message from <code>@{ctx.env.RESET_BOT_USERNAME}</code> on Bluesky with a link to reset your password.<br /><br />
            If you encounter errors, your Bluesky Communication settings might be set to forbid contact via Direct Messages from accounts you don't follow.<br />
            It is <u>heavily recommended</u> that <a href={botAccountURL} target="_blank">you follow the service account</a>.</p>
        </center>

        <UsernameField />

        <TurnstileCaptcha c={ctx} />
    </AccountHandler>
    </BaseLayout>
  );
}