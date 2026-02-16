import { Context } from "hono";
import { UseCFTurnstile } from "../../utils/helpers";

export function TurnstileCaptchaPreloads(ctx: Context) {
  if (UseCFTurnstile(ctx)) {
    return [{type: "script", href: "https://challenges.cloudflare.com/turnstile/v0/api.js"}];
  }
  return [];
}

export function TurnstileCaptcha(props: any) {
  const ctx: Context = props.c;
  return (
    <>
    {UseCFTurnstile(ctx) ? (
      <label>
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
        Captcha
        <div class="cf-turnstile" data-theme="dark" data-sitekey={ctx.env.TURNSTILE_PUBLIC_KEY}></div>
      </label>
    ) : ''}
    </>
  );
}