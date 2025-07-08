import { z } from "zod";
import { appPasswordRegex, usernameRegex } from "./regexCases";
import { BSKY_MAX_APP_PASSWORD_LENGTH, BSKY_MIN_USERNAME_LENGTH, MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits.d";

export const AccountUpdateSchema = z.object({
  username: z.string()
    .min(BSKY_MIN_USERNAME_LENGTH, "username too short")
    .regex(usernameRegex)
    .optional()
    .or(z.literal("")),
  password: z.string()
    .min(MIN_DASHBOARD_PASS, "password too short")
    .max(MAX_DASHBOARD_PASS, "password too long")
    .optional()
    .or(z.literal("")),
  bskyAppPassword: z.string()
    .max(BSKY_MAX_APP_PASSWORD_LENGTH, "app password too long")
    .regex(appPasswordRegex)
    .optional()
    .or(z.literal(""))
});