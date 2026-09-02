import * as z from "zod/v4";
import {
  BSKY_MAX_APP_PASSWORD_LENGTH,
  BSKY_MAX_USERNAME_LENGTH,
  BSKY_MIN_USERNAME_LENGTH,
  MAX_ALT_TEXT,
  MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS
} from "../limits";
import { checkValidDateStr } from "../utils/helpers";
import { appPasswordRegex, domainRegexCheck } from "./regexCases";

export const UsernameSchema = z.object({
  username: z.string().trim().toLowerCase()
    .nonempty("username is missing")
    .min(BSKY_MIN_USERNAME_LENGTH, "username too short")
    .regex(domainRegexCheck, "username should be in a format like username.bsky.social or a domain")
    .max(BSKY_MAX_USERNAME_LENGTH, "username too long")
    .nonoptional()
});

export const PasswordSchema = z.object({
  password: z.string().trim()
    .nonempty("password is missing")
    .min(MIN_DASHBOARD_PASS, "password too short")
    .max(MAX_DASHBOARD_PASS, "password too long")
    .nonoptional(),
});

export const BSkyAppPasswordSchema = z.object({
  bskyAppPassword: z.string().trim()
    .nonempty("missing bsky app password")
    .max(BSKY_MAX_APP_PASSWORD_LENGTH, "app password too long")
    .regex(appPasswordRegex, "please go back and recreate a new app password from your bsky settings")
});

export const AltTextSchema = z.object({
  alt: z.string().trim()
    .max(MAX_ALT_TEXT, "alt text is too long")
    .prefault("")
});

export const ScheduledDateSchema = z.object({
  // no matter what the client does end up sending, we floor to the nearest valid time.
  // these are verified in the superRefnes for the post/repost schemas
  scheduledDate: z.string().trim()
    .nonempty("scheduled date is malformed")
    .nonoptional("scheduled date must be provided")
    .refine((date) => checkValidDateStr(date), {error: "invalid date, please use ISO 8601 format", abort: true, path: ["scheduledDate"]}),
});