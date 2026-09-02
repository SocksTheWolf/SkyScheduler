import * as z from "zod/v4";
import { REPOSTING_TIME_INTERVAL } from "../config";
import { MAX_REPOST_IN_HOURS, MAX_REPOST_INTERVAL_LIMIT } from "../limits";

export const RepostDataSchema = z.object({
  repostData: z.object({
    hours: z.coerce.number()
      // technically this should be greater than 0, but openapi 3.0.3 doesn't generate properly
      // when just using gt instead of gte
      .gte(0, "Repost hours must be greater than 0")
      .max(MAX_REPOST_IN_HOURS)
      .refine((num: number) => {
        // so fail the number check here instead
        if (num == 0)
          return false;

        return (num % (REPOSTING_TIME_INTERVAL / 60)) == 0;
      },
      {error: "Reposting cadance value is not allowed", abort: true}),
    times: z.coerce.number()
      .int("floating point values are not allowed")
      .min(1).max(MAX_REPOST_INTERVAL_LIMIT)
  }).optional()
});
