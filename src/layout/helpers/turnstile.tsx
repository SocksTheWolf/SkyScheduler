import type { AllContext, BaseElementProps } from "../../types";
import { useCFTurnstile } from "../../utils/helpers";

export function TurnstileCaptchaPreloads(ctx: AllContext) {
  if (useCFTurnstile(ctx)) {
    return [{type: "script", href: "https://challenges.cloudflare.com/turnstile/v0/api.js"}];
  }
  return [];
}

export function TurnstileCaptcha(props: BaseElementProps) {
  return (<>
    {useCFTurnstile(props.ctx) ? (
      <label>
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer nonce={props.ctx!.get("secureHeadersNonce")}></script>
        Captcha
        <div class="cf-turnstile" data-theme="dark" data-sitekey={props.ctx!.env.TURNSTILE_PUBLIC_KEY}></div>
      </label>
    ) : ''}
  </>);
}