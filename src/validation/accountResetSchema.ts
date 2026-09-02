import * as z from "zod/v4";
import { PasswordDefinition } from "./sharedDefinitions";
import { PasswordSchema } from "./sharedSchemas";

export const AccountResetSchema = z.object({
  resetToken: z.string().nonempty("reset token is missing!"),
  ...PasswordSchema.shape,
  confirmPassword: PasswordDefinition.clone()
    .nonoptional("confirmed password must be provided"),
}).refine((schema) => schema.confirmPassword === schema.password, {error: "Passwords do not match", abort: true});