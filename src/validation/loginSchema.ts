import * as z from "zod/v4";
import { PasswordSchema, UsernameSchema } from "./sharedValidations";

// Schema for login validation
export const LoginSchema = z.object({
  ...UsernameSchema.shape,
  ...PasswordSchema.shape,
});
