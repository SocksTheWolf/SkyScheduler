// Everything in this file is used for OpenAPI route generation.
//
// This can be the generally expected results for most endpoints
// but not all.
import * as z from "zod/v4";
import { fileKeyRegex } from "./regexCases";

// Our json response objects
export const GenericResponseSchema = z.object({
  ok: z.boolean(),
  msg: z.string()
});

export const CreateResponseSchema = z.object({
  ...GenericResponseSchema.shape,
  id: z.uuidv4(),
});

export const CheckGUIDSchema = z.object({
  id: z.uuidv4()
});

export const CheckFileSchema = z.object({
  id: z.string().toLowerCase()
    .regex(fileKeyRegex)
    .nonempty()
});

export const FileUploadFailSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export const FileUploadSuccessSchema = z.object({
  success: z.literal(true),
  fileSize: z.number().min(1),
  qualityLevel: z.number().min(1).max(100),
  data: z.string(),
  originalName: z.string()
})