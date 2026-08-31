import * as z from "zod/v4";

// These schemas are only used for defining openAPI routes.
export const ResetCallbackQuery = z.object({
  callbackURL: z.union([z.literal("%2Freset"), z.literal("/reset")]).nonoptional()
});

// according to better-auth code, the token will be longer than 10 chars
// https://github.com/better-auth/better-auth/blob/0bb0dbf6f38ab53a0c1f2fb639acd7bd602e2a24/packages/test-utils/src/adapter/suites/auth-flow.ts#L113
export const ResetTokenValid = z.string().min(10).nonempty().nonoptional();