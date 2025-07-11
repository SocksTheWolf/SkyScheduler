import * as z from "zod/v4";
import { appPasswordRegex } from "./regexCases";
import { BSKY_MAX_APP_PASSWORD_LENGTH, BSKY_MIN_USERNAME_LENGTH, MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits.d";

export const SignupSchema = z.object({
  signupToken: z.string().optional(),
  username: z.string().trim().toLowerCase()
    .nonempty("username is missing")
    .min(BSKY_MIN_USERNAME_LENGTH, "username too short")
    .regex(z.regexes.domain),
  password: z.string().trim()
    .nonempty("password is missing")
    .min(MIN_DASHBOARD_PASS, "password too short")
    .max(MAX_DASHBOARD_PASS, "password too long"),
  bskyAppPassword: z.string().trim()
    .nonempty("missing bsky app password")
    .max(BSKY_MAX_APP_PASSWORD_LENGTH, "app password too long")
    .regex(appPasswordRegex)
});