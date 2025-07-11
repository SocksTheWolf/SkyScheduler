import * as z from "zod/v4";
import { MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits.d";

export const AccountDeleteSchema = z.object({
  password: z.string().trim()
    .min(MIN_DASHBOARD_PASS, "password too short")
    .max(MAX_DASHBOARD_PASS, "password too long")
    .nonempty("password cannot be empty")
    .nonoptional()
});