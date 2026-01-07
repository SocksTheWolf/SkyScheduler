import { Context } from "hono";

export function TurnstileCaptchaPreloads(ctx: Context) {
  if (ctx.env.SIGNUP_SETTINGS.use_captcha) {
    return [{type: "script", href: "https://challenges.cloudflare.com/turnstile/v0/api.js"}];
  }
  return [];
}

export function TurnstileCaptcha(props: any) {
  const ctx: Context = props.c;
  return (
    <>
    {ctx.env.SIGNUP_SETTINGS.use_captcha ? (
      <label>
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
        Captcha
        <div class="cf-turnstile" data-sitekey={ctx.env.TURNSTILE_PUBLIC_KEY}></div>
      </label>
    ) : ''}
    </>
  );
}