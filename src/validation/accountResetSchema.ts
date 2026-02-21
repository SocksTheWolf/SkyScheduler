import * as z from "zod/v4";
import { MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits";

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

// encoded strings
const uriComponent = z.codec(z.string(), z.string(), {
  decode: (encodedString) => decodeURIComponent(encodedString),
  encode: (decodedString) => encodeURIComponent(decodedString),
});
export const PasswordResetCheckCallbackParam = z.object({
  callbackURL: z.literal(z.encode(uriComponent, "/reset"))
});

export const PasswordResetTokenParam = z.object({
  id: z.string().min(20).max(64)
});