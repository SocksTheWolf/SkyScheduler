import * as z from "zod/v4";
import { REPOSTING_TIME_INTERVAL } from "../config";
import { MAX_REPOST_IN_HOURS, MAX_REPOST_INTERVAL_LIMIT } from "../limits";

export const RepostDataSchema = z.object({
  repostData: z.object({
    hours: z.coerce.number()
      .gt(0, "Repost hours must be greater than 0")
      .max(MAX_REPOST_IN_HOURS)
      .refine((num) => {
          return (num % (REPOSTING_TIME_INTERVAL / 60)) == 0;
        },
      {error: "Reposting cadance value is not allowed"}),
    times: z.coerce.number()
      .int("floating point values are not allowed")
      .min(1).max(MAX_REPOST_INTERVAL_LIMIT)
  }).optional()
});
