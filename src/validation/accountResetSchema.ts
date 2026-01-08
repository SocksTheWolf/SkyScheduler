import * as z from "zod/v4";
import { MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits.d";

export const AccountResetSchema = z.object({
  resetToken: z.string().nonempty("reset token is missing!"),
  password: z.string().trim()
    .min(MIN_DASHBOARD_PASS, "password too short")
    .max(MAX_DASHBOARD_PASS, "password too long")
    .nonempty("password cannot be empty")
    .nonoptional(),
  confirmPassword: z.string().trim()
    .min(MIN_DASHBOARD_PASS, "confirm password too short")
    .max(MAX_DASHBOARD_PASS, "confirm password too long")
    .nonempty("confirm password cannot be empty")
    .nonoptional(),
}).refine((schema) => schema.confirmPassword === schema.password, "Passwords do not match");