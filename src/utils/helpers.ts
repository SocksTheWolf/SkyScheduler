import { startOfHour, subDays } from "date-fns";
import { Context } from "hono";
import has from "just-has";

export function floorCurrentTime() {
  return startOfHour(new Date());
}

export function floorGivenTime(given: Date) {
  return startOfHour(given);
}

export function daysAgo(days: number) {
  return subDays(new Date(), days);
}

export function useCFTurnstile(ctx: Context): boolean {
  return ctx.env.SIGNUP_SETTINGS.use_captcha && ctx.env.IN_DEV === false;
}

export function isPost(data: any): boolean {
  return has(data, "user");
}