// Everything in this file is used for OpenAPI route generation.
//
// This can be the generally expected results for most endpoints
// but not all.
import * as z from "zod/v4";
import { fileKeyRegex } from "./regexCases";

// Our json response objects
export const GenericResponseSchema = z.object({
  ok: z.boolean().describe("success/failure status check"),
  msg: z.string().describe("success/error message, could also be formatted as json")
});

export const CreatePostResponseSchema = z.object({
  ...GenericResponseSchema.shape,
  id: z.uuidv4().describe("the post/repost id"),
});

export const CheckGUIDSchema = z.object({
  id: z.uuidv4().describe("the post/repost id")
});

export const CheckRepostGUIDSchema = z.object({
  ...CheckGUIDSchema.shape,
  schedule: z.uuidv4().describe("the schedule id for a post")
})

export const CheckFileSchema = z.object({
  id: z.string().toLowerCase()
    .regex(fileKeyRegex)
    .nonempty().describe("the internal file guid name")
});

export const FileUploadFailSchema = z.object({
  success: z.literal(false),
  error: z.string().describe("the error message, could also be json")
});

export const FileUploadSuccessSchema = z.object({
  success: z.literal(true),
  fileSize: z.number().min(1).describe("the size of the uploaded file"),
  qualityLevel: z.number().min(1).max(100)
    .describe("the quality level of the processed file (if compressed/resized)"),
  data: z.string().describe("internal file guid name"),
  originalName: z.string().describe("the original file name")
});

// These schemas are only used for defining openAPI routes.
export const ResetCallbackQuery = z.object({
  callbackURL: z.union([z.literal("%2Freset"), z.literal("/reset")]).nonoptional()
});

// according to better-auth code, the token will be longer than 10 chars
// https://github.com/better-auth/better-auth/blob/0bb0dbf6f38ab53a0c1f2fb639acd7bd602e2a24/packages/test-utils/src/adapter/suites/auth-flow.ts#L113
export const ResetTokenValid = z.object({
  token: z.string().min(10).nonempty().nonoptional()
});