import * as z from "zod/v4";
import { appPasswordRegex } from "./regexCases";
import { BSKY_MAX_APP_PASSWORD_LENGTH, BSKY_MIN_USERNAME_LENGTH, MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits.d";

export const AccountUpdateSchema = z.object({
  username: z.string().trim().toLowerCase()
    .min(BSKY_MIN_USERNAME_LENGTH, "username too short")
    .regex(z.regexes.domain)
    .optional()
    .or(z.literal("")),
  password: z.string().trim()
    .min(MIN_DASHBOARD_PASS, "password too short")
    .max(MAX_DASHBOARD_PASS, "password too long")
    .optional()
    .or(z.literal("")),
  bskyAppPassword: z.string().trim()
    .max(BSKY_MAX_APP_PASSWORD_LENGTH, "app password too long")
    .regex(appPasswordRegex)
    .optional()
    .or(z.literal("")),
  bskyUserPDS: z.url("PDS should be in the format of an URL").trim()
    .optional()
    .or(z.literal(""))
});