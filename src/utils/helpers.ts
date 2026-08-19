import type { FormatDurationOptions } from "date-fns";
import { formatDuration, roundToNearestMinutes, startOfHour, subDays } from "date-fns";
import { drizzle } from "drizzle-orm/d1";
import { POSTING_TIME_INTERVAL, REPOSTING_TIME_INTERVAL, USE_CAPTCHA } from "../config";
import { schema } from "../db/schema";
import { EmbedDataType, TimeIntervalSettings, TimeShape } from "../enums";
import type { AllContext, BaseContext, Bindings, LooseObj } from "../types";

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

export function isInDev(env?: Bindings) {
  if (env === undefined)
    return false;

  // eslint-disable-next-line @typescript-eslint/dot-notation
  return env["IN_DEV"] === "true";
}

export function useCFTurnstile(ctx: AllContext|undefined): boolean {
  if (isInDev(ctx?.env))
    return false;

  return USE_CAPTCHA;
}

export function isAltEditableType(type: EmbedDataType) {
  return type === EmbedDataType.Image || type === EmbedDataType.Video;
}

export function has(obj: unknown, property: string): boolean {
  if (!obj)
    return false;

  // eslint-disable-next-line n/no-unsupported-features/es-builtins
  if (Object.hasOwn(obj, property)) {
    // @ts-ignore
    return obj[property] !== undefined && obj[property] !== null;
  }
  return false;
}

export const logoutAccount = async (c: BaseContext): Promise<boolean> => {
  try {
    const auth = c.get("auth");
    await auth.api.signOut({ headers: c.req.raw.headers });
    return true;
  } catch (err: unknown) {
    console.error("Unable to handle logout properly, redirecting anyways. " + String(err));
  }
  return false;
};

export const checkValidDateStr = (date: string): boolean => {
  try {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  } catch {
    return false;
  }
};

export const clearWorkersCache = async (ctx: ExecutionContext, options: CachePurgeOptions): Promise<boolean> => {
  if (!ctx.cache)
    return false;

  const clearRequest = await ctx.cache.purge(options);
  if (!clearRequest.success) {
    if (clearRequest.errors.length > 0) {
      const clearErrors: string[] = clearRequest.errors.map((err) => err.message);
      console.error(`Unable to clear workers cache, got ${clearErrors.join(",")}`);
    }
    return false;
  }
  return true;
};

export function getDrizzle(DB: D1Database) {
  // This is currently separated in a helper function
  // so that if we get D1 read replicas, we can easily invoke them.
  return drizzle(DB, { schema, logger: false });
}