import z from "zod";
import { PasswordSchema, UsernameSchema } from "./sharedValidations";

const uriComponent = z.codec(z.string(), z.string(), {
  decode: (encodedString) => decodeURIComponent(encodedString),
  encode: (decodedString) => encodeURIComponent(decodedString),
});

export const AccountDeleteSchema = PasswordSchema;
export const AccountForgotSchema = UsernameSchema;
export const CheckCallbackParam = z.object({
  callbackURL: z.literal(z.encode(uriComponent, "/reset"))
});
export const PasswordResetPart = z.string().min(20).max(64);