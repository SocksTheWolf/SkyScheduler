import * as z from "zod/v4";
import { fileKeyRegex } from "./regexCases";

export const FileContentSchema = z.object({
  content: z.string().toLowerCase().regex(fileKeyRegex, "file key is invalid").nonempty("file key was empty")
});

export const FileDeleteSchema = FileContentSchema;