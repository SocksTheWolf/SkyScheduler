import type { FormatDurationOptions } from "date-fns";
import { addYears, formatDuration, isAfter, isBefore, roundToNearestMinutes, startOfHour, subDays } from "date-fns";
import { POSTING_TIME_INTERVAL, REPOSTING_TIME_INTERVAL } from "../config";
import { DateValidCheck, TimeIntervalSettings, TimeShape } from "../enums";
import { MAX_FUTURE_DATE_VALUE } from "../limits";
import type { LooseObj } from "../types";

export function isDateValid(given: Date, shape: TimeShape): DateValidCheck {
  const currentDate = new Date();
  const wantedDate = floorGivenTime(given, shape);
  const futureDateClamp = addYears(currentDate, MAX_FUTURE_DATE_VALUE);
  if (!isAfter(wantedDate, currentDate))
    return DateValidCheck.IsPastDate;
  else if (!isBefore(wantedDate, futureDateClamp))
    return DateValidCheck.TooFutureDate;
  return DateValidCheck.Ok;
}

export function floorCurrentTime(shape: TimeShape = TimeShape.Post): Date {
  return floorGivenTime(new Date(), shape);
}

export function floorGivenTime(given: Date, shape: TimeShape): Date {
  const roundingSettings: LooseObj = { roundingMethod: "floor" };
  const check: TimeIntervalSettings = shape == TimeShape.Repost ? REPOSTING_TIME_INTERVAL : POSTING_TIME_INTERVAL;
  switch (check) {
    default:
    case TimeIntervalSettings.Hour:
      return startOfHour(given);
    case TimeIntervalSettings.HalfHour:
    case TimeIntervalSettings.QuarterHour:
    case TimeIntervalSettings.TenMinutes:
    case TimeIntervalSettings.FiveMinutes:
      roundingSettings.nearestTo = check;
      break;
  }
  return roundToNearestMinutes(given, roundingSettings);
}

export function formatTimeFromHours(inputHours: number): string {
  const formatDateOptions: FormatDurationOptions = { zero: false, format: ["days", "hours", "minutes"] };
  const overageDays = Math.floor(inputHours / 24);
  const flatHours = Math.floor(inputHours) % 24;
  const realMinutes = Math.ceil(inputHours * 60) % 60;
  return formatDuration({ days: overageDays, hours: flatHours, minutes: realMinutes }, formatDateOptions);
}

export function formatTime(day: number, hour: number, minutes: number): string {
  const formatDateOptions: FormatDurationOptions = { zero: false, format: ["days", "hours", "minutes"] };
  return formatDuration({ days: day, hours: hour, minutes: minutes }, formatDateOptions);
}

export function explainTimeInterval(input: TimeIntervalSettings, usePlural: boolean = false): string {
  switch (input) {
    default:
    case TimeIntervalSettings.Hour:
      return "hour";
    case TimeIntervalSettings.HalfHour:
      return "half hour";
    case TimeIntervalSettings.QuarterHour:
    case TimeIntervalSettings.TenMinutes:
    case TimeIntervalSettings.FiveMinutes:
      return `${input} minute${usePlural ? 's' : ''}`;
  }
}

export function explainRepostTimeInterval(): string {
  return explainTimeInterval(REPOSTING_TIME_INTERVAL);
}

export function explainPostingTimeInterval(): string {
  return explainTimeInterval(POSTING_TIME_INTERVAL);
}

export function getDateDaysAgo(days: number): Date {
  return subDays(new Date(), days);
}

export const checkValidDateStr = (date: string): boolean => {
  try {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  } catch {
    return false;
  }
};

