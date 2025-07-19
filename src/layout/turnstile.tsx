import { Context } from "hono";

export default function TurnstileCaptcha(props: any) {
  const ctx: Context = props.c;
  return (
    <>
    {ctx.env.USE_TURNSTILE_CAPTCHA ? (
      <label>
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
        Captcha
        <div class="cf-turnstile" data-sitekey={ctx.env.TURNSTILE_PUBLIC_KEY}></div>
      </label>
    ) : ''}
    </>
  );
}