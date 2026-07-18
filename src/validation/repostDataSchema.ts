import * as z from "zod/v4";
import { MAX_REPOST_IN_HOURS, MAX_REPOST_INTERVAL_LIMIT } from "../limits";

export const RepostDataSchema = z.object({
  repostData: z.object({
    /* hours is checked for validity via the respective repost/post superrefine cases */
    hours: z.coerce.number().max(MAX_REPOST_IN_HOURS),
    times: z.coerce.number().int("floating point values are not allowed")
      .min(1).max(MAX_REPOST_INTERVAL_LIMIT)
  }).optional()
});
