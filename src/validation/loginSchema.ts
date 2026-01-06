import { PasswordSchema, UsernameSchema } from "./sharedValidations";
import * as z from "zod/v4";

// Schema for login validation
export const LoginSchema = z.object({
  ...UsernameSchema.shape,
  ...PasswordSchema.shape,
});
