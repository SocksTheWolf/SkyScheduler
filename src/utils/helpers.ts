import {
  formatDuration, type FormatDurationOptions,
  roundToNearestMinutes, startOfHour, subDays
} from "date-fns";
import has from "just-has";
import { EmbedDataType, TimeIntervalSettings } from "../enums";
import { POSTING_TIME_INTERVAL, REPOSTING_TIME_INTERVAL } from "../limits";
import type { AllContext, LooseObj } from "../types";

export function floorCurrentTime(forRepost: boolean=false): Date {
  return floorGivenTime(new Date(), forRepost);
}

export function floorGivenTime(given: Date, forRepost: boolean=false): Date {
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

export function formatTimeFromHours(inputHours: number): string {
  const formatDateOptions: FormatDurationOptions = {zero: false, format: ["days", "hours", "minutes"]};
  const overageDays = Math.floor(inputHours/24);
  const flatHours = Math.floor(inputHours) % 24;
  const realMinutes = Math.ceil(inputHours * 60) % 60;
  return formatDuration({days: overageDays, hours: flatHours, minutes: realMinutes}, formatDateOptions);
}

export function formatTime(day: number, hour: number, minutes: number): string {
  const formatDateOptions: FormatDurationOptions = {zero: false, format: ["days", "hours", "minutes"]};
  return formatDuration({days: day, hours: hour, minutes: minutes}, formatDateOptions);
}

export function explainPostingTimeInterval(): string {
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

export function daysAgo(days: number): Date {
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

export function isAltEditableType(type: EmbedDataType) {
  return type === EmbedDataType.Image || type === EmbedDataType.Video;
}