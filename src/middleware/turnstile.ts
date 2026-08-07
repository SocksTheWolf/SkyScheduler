import type { BaseContext } from "../types";
import { useCFTurnstile } from "../utils/helpers";

type TurnstileResponse = {
  success: boolean;
};

type TurnstileRequestData = {
  "cf-turnstile-response": string
}

// Middleware that handles turnstile verification.
export async function verifyTurnstile(c: BaseContext, next: any) {
  if (useCFTurnstile(c)) {
    const reqData = await c.req.json<TurnstileRequestData>();
    const userIP: string|undefined = c.req.header("CF-Connecting-IP");
    const token: string = reqData["cf-turnstile-response"];

    const formData = new FormData();
    formData.append("secret", c.env.TURNSTILE_SECRET_KEY);
    formData.append("response", token);
    if (userIP)
      formData.append("remoteip", userIP);

    const turnstileFetch = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData
    });

    // Check if we could contact siteverify
    if (!turnstileFetch.ok) {
      return c.json({ok: false, msg: "timed out verifying captcha"}, 400);
    }

    // Check if the output was okay
    const turnstileOutcome = await turnstileFetch.json<TurnstileResponse>();
    if (!turnstileOutcome.success) {
      return c.json({ok: false, msg: "captcha timed out"}, 401);
    }
  }
  await next();
};