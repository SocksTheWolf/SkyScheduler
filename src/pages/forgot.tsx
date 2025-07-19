import { Context } from "hono";
import { BaseLayout } from "../layout/main";
import NavTags from "../layout/navTags";
import AccountHandler from "../layout/account";
import UsernameField from "../layout/usernameField";
import TurnstileCaptcha from "../layout/turnstile";

export default function ForgotPassword(props:any) {
  const ctx: Context = props.c;
  return (
    <BaseLayout title="SkyScheduler - Forgot Password">
      <NavTags />
      <AccountHandler title="Forgot Password Reset" 
        submitText="Request Password Reset"
        loadingText="Requesting Password Reset..." endpoint="/account/forgot" 
        successText="Success! Check your bsky dms for info. Redirecting to home.." 
        redirect="/">

        <center><p>You will recieve a Direct Message from <code>@{ctx.env.RESET_BOT_USERNAME}</code> on Bluesky with a link to reset your password.</p></center>

        <UsernameField />

        <TurnstileCaptcha c={ctx} />
    </AccountHandler>
    </BaseLayout>
  );
}