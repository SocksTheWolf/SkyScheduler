import * as z from "zod/v4";
import { MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits";

export const AccountResetSchema = z.object({
  resetToken: z.string().nonempty("reset token is missing!"),
  password: z.string().trim()
    .min(MIN_DASHBOARD_PASS, "password too short")
    .max(MAX_DASHBOARD_PASS, "password too long")
    .nonempty("password cannot be empty")
    .nonoptional("new password must be provided"),
  confirmPassword: z.string().trim()
    .min(MIN_DASHBOARD_PASS, "confirm password too short")
    .max(MAX_DASHBOARD_PASS, "confirm password too long")
    .nonempty("confirm password cannot be empty")
    .nonoptional("confirm password must be provided"),
}).refine((schema) => schema.confirmPassword === schema.password, {error: "Passwords do not match", abort: true});