import { roundToNearestMinutes, startOfHour, subDays } from "date-fns";
import has from "just-has";
import { TimeIntervalSettings } from "../enums";
import { POSTING_TIME_INTERVAL, REPOSTING_TIME_INTERVAL } from "../limits";
import type { AllContext, LooseObj } from "../types";

export function floorCurrentTime(forRepost: boolean=false) {
  return floorGivenTime(new Date(), forRepost);
}

export function floorGivenTime(given: Date, forRepost: boolean=false) {
  let roundingSettings: LooseObj = { roundingMethod: 'floor' };
  const check: TimeIntervalSettings = forRepost ? REPOSTING_TIME_INTERVAL : POSTING_TIME_INTERVAL;
  switch (check) {
    default:
    case TimeIntervalSettings.Hour:
      return startOfHour(given);
    case TimeIntervalSettings.HalfHour:
    case TimeIntervalSettings.QuarterHour:
    case TimeIntervalSettings.TenMinutes:
    case TimeIntervalSettings.FiveMinutes:
      roundingSettings.nearestTo = check as Number;
    break;
  }
  return roundToNearestMinutes(given, roundingSettings);
}

export function explainPostingTimeInterval() {
  switch (POSTING_TIME_INTERVAL) {
    default:
    case TimeIntervalSettings.Hour:
      return "hour";
    case TimeIntervalSettings.HalfHour:
      return "half hour";
    case TimeIntervalSettings.QuarterHour:
    case TimeIntervalSettings.TenMinutes:
    case TimeIntervalSettings.FiveMinutes:
      return `${POSTING_TIME_INTERVAL} minutes`;
  }
}

export function daysAgo(days: number) {
  return subDays(new Date(), days);
}

export function useCFTurnstile(ctx: AllContext|undefined): boolean {
  if (ctx === undefined)
    return false;

  return ctx.env.SIGNUP_SETTINGS.use_captcha && ctx.env.IN_DEV === false;
}

export function isPost(data: any): boolean {
  return has(data, "user");
}