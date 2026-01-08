import * as z from "zod/v4";
import {
  BSKY_MAX_APP_PASSWORD_LENGTH,
  BSKY_MAX_USERNAME_LENGTH,
  BSKY_MIN_USERNAME_LENGTH,
  MAX_ALT_TEXT,
  MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS
} from "../limits.d";
import { appPasswordRegex } from "./regexCases";

export const UsernameSchema = z.object({
  username: z.string().trim().toLowerCase()
    .nonempty("username is missing")
    .min(BSKY_MIN_USERNAME_LENGTH, "username too short")
    .regex(z.regexes.domain, "username should be in a format like username.bsky.social or a domain")
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
    .regex(appPasswordRegex, "please go back and recreate your app password from your bsky settings")
});

export const AltTextSchema = z.object({
  alt: z.string().trim()
    .max(MAX_ALT_TEXT, "alt text is too long")
    .prefault("")
});