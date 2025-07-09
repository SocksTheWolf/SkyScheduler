import { z } from "zod";
import { BSKY_MIN_USERNAME_LENGTH, MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits.d";
import { usernameRegex } from "./regexCases";

// Schema for login validation
export const LoginSchema = z.object({
  username: z.string()
    .nonempty("username is missing")
    .min(BSKY_MIN_USERNAME_LENGTH, "username too short")
    .regex(usernameRegex),
  password: z.string()
    .nonempty("password is missing")
    .min(MIN_DASHBOARD_PASS, "password too short")
    .max(MAX_DASHBOARD_PASS, "password too long"),
});
