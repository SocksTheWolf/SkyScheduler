// Everything in this file is used for OpenAPI route generation.
//
// This can be the generally expected results for most endpoints
// but not all.
import * as z from "zod/v4";
import { fileKeyRegex } from "./regexCases";

// Our json response objects
export const GenericResponseSchema = z.object({
  ok: z.boolean(),
  msg: z.string().describe("success/error message, could also be formatted as json")
});

export const CreatePostResponseSchema = z.object({
  ...GenericResponseSchema.shape,
  id: z.uuidv4().describe("the post/repost id"),
});

export const CheckGUIDSchema = z.object({
  id: z.uuidv4().describe("the post/repost id")
});

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
  fileSize: z.number().min(1),
  qualityLevel: z.number().min(1).max(100)
    .describe("the quality level of the processed file (if compressed/resized)"),
  data: z.string().describe("internal file guid name"),
  originalName: z.string().describe("the original file name")
});