import { Context } from "hono";

// Middleware that handles turnstile verification.
export async function verifyTurnstile(c: Context, next: any) {
  if (c.env.USE_TURNSTILE_CAPTCHA) {
    const body = await c.req.json();
    const userIP: string|undefined = c.req.header("CF-Connecting-IP");
    const token = body["cf-turnstile-response"];

    let formData = new FormData();
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
      return c.json({ok: false, message: "timed out verifying captcha"}, 400);
    }

    // Check if the output was okay
    const turnstileOutcome:any = await turnstileFetch.json();
    if (!turnstileOutcome.success) {
      return c.json({ok: false, message: "captcha timed out"}, 401);
    }
  }
  await next();
}