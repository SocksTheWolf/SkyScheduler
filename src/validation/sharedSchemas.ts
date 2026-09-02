import * as z from "zod/v4";
import { MAX_ALT_TEXT } from "../limits";
import { checkValidDateStr } from "../utils/helpers";
import { AppPasswordDefinition, PasswordDefinition, UsernameDefinition } from "./sharedDefinitions";

export const UsernameSchema = z.object({
  username: UsernameDefinition.clone()
    .nonempty("username is missing")
    .nonoptional()
});

export const PasswordSchema = z.object({
  password: PasswordDefinition.clone().nonoptional(),
});

export const BSkyAppPasswordSchema = z.object({
  bskyAppPassword: AppPasswordDefinition
});

export const AltTextSchema = z.object({
  alt: z.string().trim()
    .max(MAX_ALT_TEXT, "alt text is too long")
    .prefault("")
});

export const ScheduledDateSchema = z.object({
  // no matter what the client does end up sending, we floor to the nearest valid time.
  //
  // this value is fully verified in the superRefines for the post/repost schemas as there is additional
  // logic to check for
  scheduledDate: z.string().trim()
    .nonempty("scheduled date is malformed")
    .nonoptional("scheduled date must be provided")
    .refine((date) => checkValidDateStr(date),
      {error: "invalid date, please use ISO 8601 format", abort: true, path: ["scheduledDate"]}),
});