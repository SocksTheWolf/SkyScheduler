import * as z from "zod/v4";
import {
  BSKY_MAX_APP_PASSWORD_LENGTH, BSKY_MAX_USERNAME_LENGTH,
  BSKY_MIN_USERNAME_LENGTH, MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS
} from "../limits";
import { appPasswordRegex, domainRegexCheck } from "./regexCases";

export const UsernameDefinition = z.string().trim().toLowerCase()
  .min(BSKY_MIN_USERNAME_LENGTH, "username too short")
  .max(BSKY_MAX_USERNAME_LENGTH, "username too long")
  .regex(domainRegexCheck, "username should be in a format like username.bsky.social or a domain");

export const PasswordDefinition = z.string().trim()
  .nonempty("password is missing")
  .min(MIN_DASHBOARD_PASS, "password too short")
  .max(MAX_DASHBOARD_PASS, "password too long");

export const AppPasswordDefinition = z.string().trim()
  .nonempty("missing bsky app password")
  .max(BSKY_MAX_APP_PASSWORD_LENGTH, "app password too long")
  .regex(appPasswordRegex, "invalid app password, recreate a new app password from your bsky settings");