import { MAX_ALT_TEXT, MIN_LENGTH, MAX_REPOST_INTERVAL, MAX_HOURS_REPOSTING } from "../limits.d";
import { PostLabel } from "../types.d";
import { fileKeyRegex } from "./regexCases";
import * as z from "zod/v4";

// Schema for post creation
export const PostSchema = z.object({
  content: z.string().min(MIN_LENGTH, "post is too short").nonempty("post cannot be empty"),
  label: z.nativeEnum(PostLabel).optional().default(PostLabel.None),
  embeds: z.object({
    content: z.string().nonempty().regex(fileKeyRegex),
    alt: z.string().max(MAX_ALT_TEXT, "alt text is too long")
  }).array().optional(),
  makePostNow: z.boolean().default(false),
  repostData: z.object({
    hours: z.coerce.number().min(1).max(MAX_HOURS_REPOSTING),
    times: z.coerce.number().min(1).max(MAX_REPOST_INTERVAL)
  }).optional(),
  scheduledDate: z.string().refine((date) => {
    try {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    } catch {
      return false;
    }
  }, "Invalid date format. Please use ISO 8601 format (e.g. 2024-12-14T07:17:05+01:00)"),
});

export const EditSchema = z.object({
  content: z.string().min(MIN_LENGTH, "post is too short").nonempty("post cannot be empty")
});