import * as z from "zod/v4";
import { MAX_POSTED_LENGTH, MAX_REPOST_IN_HOURS, MAX_REPOST_INTERVAL_LIMIT } from "../limits";
import { atProtoPostURI, postRecordURI, repostContentRecord } from "./regexCases";

export const RepostSchema = z.object({
  url: z.url({
    normalize: true,
    protocol: /^https?$/,
    hostname: z.regexes.domain,
    error: "provided link is not a valid URL"
  }).trim()
    .regex(postRecordURI, "url is not a valid post record link")
    .nonoptional("a valid url was not provided"),
  uri: z.string().trim().min(1)
    .regex(atProtoPostURI, "post record is invalid")
    .nonoptional("post uri must be provided"),
  cid: z.string().trim().min(1).nonoptional("post data must be provided"),
  repostData: z.object({
    hours: z.coerce.number().min(1).max(MAX_REPOST_IN_HOURS),
    times: z.coerce.number().min(1).max(MAX_REPOST_INTERVAL_LIMIT)
  }).optional(),
  content: z.xor([
      z.string().trim().max(MAX_POSTED_LENGTH, "repost title is too long"),
      z.string().trim().regex(repostContentRecord)
    ], "invalid repost title").optional(),
  scheduledDate: z.string().refine((date) => {
    try {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    } catch {
      return false;
    }
  }, "Invalid date format. Please use ISO 8601 format (e.g. 2024-12-14T07:17:05+01:00)"),
});