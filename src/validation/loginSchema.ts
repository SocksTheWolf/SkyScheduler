import * as z from "zod/v4";
import { BSKY_MIN_USERNAME_LENGTH, MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits.d";

// Schema for login validation
export const LoginSchema = z.object({
  username: z.string().trim().toLowerCase()
    .nonempty("username is missing")
    .min(BSKY_MIN_USERNAME_LENGTH, "username too short")
    .regex(z.regexes.domain, "username must be in the format of username.bsky.social or a custom domain"),
  password: z.string().trim()
    .nonempty("password is missing")
    .min(MIN_DASHBOARD_PASS, "password too short")
    .max(MAX_DASHBOARD_PASS, "password too long"),
});
