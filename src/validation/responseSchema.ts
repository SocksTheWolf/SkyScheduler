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

export const FileOperationResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional()
});