import { startOfHour, subDays } from "date-fns";
import { Context } from "hono";

export function floorCurrentTime() {
  return startOfHour(new Date());
}

export function floorGivenTime(given: Date) {
  return startOfHour(given);
}

export function daysAgo(days: number) {
  return subDays(new Date(), days);
}

export function UseCFTurnstile(ctx: Context): boolean {
  return ctx.env.SIGNUP_SETTINGS.use_captcha && ctx.env.IN_DEV === false;
}