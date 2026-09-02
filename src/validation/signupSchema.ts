import * as z from "zod/v4";
import { USE_INVITE_KEYS } from "../config";
import { BSkyAppPasswordSchema, PasswordSchema, UsernameSchema } from "./sharedSchemas";

export const SignupSchema = z.object({
  ...UsernameSchema.shape,
  ...PasswordSchema.shape,
  ...BSkyAppPasswordSchema.shape,
  signupToken: z.string().trim().toLowerCase().optional(),
  agreeTerms: z.literal(true, "TOS & Privacy Policy were not agreed to").nonoptional("Missing agreements"),
}).superRefine(({signupToken}, ctx) => {
  if (USE_INVITE_KEYS && signupToken === undefined) {
    ctx.addIssue({
      code: "custom",
      message: "A signup token is required to create an account",
      path: ["signupToken"]
    });
  }
});
