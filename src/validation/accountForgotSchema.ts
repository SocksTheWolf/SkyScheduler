import * as z from "zod/v4";
import { BSKY_MIN_USERNAME_LENGTH } from "../limits.d";

export const AccountForgotSchema = z.object({
  username: z.string().trim().toLowerCase()
    .min(BSKY_MIN_USERNAME_LENGTH, "username too short")
    .regex(z.regexes.domain),
});