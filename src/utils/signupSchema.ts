import { z } from "zod";

export const SignupSchema = z.object({
  signupToken: z.string().nonempty("signup token is missing"),
  username: z.string().nonempty("username is missing").min(4, "username too short"),
  password: z.string().nonempty("password is missing").min(8, "password too short").max(30, "password too long"),
  bskyAppPassword: z.string().nonempty("missing bsky app password").max(19, "app password too long").regex(/([0-9a-z]{4}-){3}[0-9a-z]{4}/i)
});