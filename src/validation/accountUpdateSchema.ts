import * as z from "zod/v4";
import { AppPasswordDefinition, PasswordDefinition, UsernameDefinition } from "./sharedDefinitions";

export const AccountUpdateSchema = z.object({
  username: UsernameDefinition.clone()
    .optional()
    .or(z.literal("")),
  password: PasswordDefinition.clone()
    .optional()
    .or(z.literal("")),
  bskyAppPassword: AppPasswordDefinition.clone()
    .optional()
    .or(z.literal("")),
  bskyUserPDS: z.url("PDS should be in the format of an URL").trim()
    .optional()
    .or(z.literal(""))
});