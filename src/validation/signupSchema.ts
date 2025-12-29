import * as z from "zod/v4";
import { PasswordSchema, UsernameSchema, BSkyAppPasswordSchema } from "./sharedValidations";

export const SignupSchema = z.object({
  ...UsernameSchema.shape,
  ...PasswordSchema.shape,
  ...BSkyAppPasswordSchema.shape,
  signupToken: z.string().trim().optional(),
});