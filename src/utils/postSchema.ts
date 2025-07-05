import { MAX_LENGTH, MAX_ALT_TEXT, MIN_LENGTH } from "../limits.d";
import { PostLabel } from "../types.d";
import { z } from "zod";

// Schema for post creation
export const PostSchema = z.object({
  content: z.string().min(MIN_LENGTH).max(MAX_LENGTH),
  label: z.nativeEnum(PostLabel).optional().default(PostLabel.None),
  embeds: z.object({
    content: z.string(),
    alt: z.string().max(MAX_ALT_TEXT)
  }).array().optional(),
  scheduledDate: z.string().refine((date) => {
    try {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    } catch {
      return false;
    }
  }, "Invalid date format. Please use ISO 8601 format (e.g. 2024-12-14T07:17:05+01:00)"),
});
