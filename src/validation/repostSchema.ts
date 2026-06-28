import * as z from "zod/v4";
import { RepostType } from "../enums";
import { MAX_REPOST_TITLE_LENGTH, REPOSTING_TIME_INTERVAL } from "../limits";
import { PostRecordSchema } from "./recordSchema";
import { postRecordURI, repostContentRecord } from "./regexCases";
import { RepostDataSchema } from "./repostDataSchema";

const PublishedRepostSchema = z.object({
  ...PostRecordSchema.shape,
  url: z.url({
    normalize: true,
    protocol: /^https?$/,
    hostname: z.regexes.domain,
    error: "provided link is not a valid URL"
  }).trim()
    .regex(postRecordURI, "url is not a valid post record link")
    .nonoptional("a valid url was not provided"),
  content: z.xor([
      z.string().trim().max(MAX_REPOST_TITLE_LENGTH, "repost title is too long"),
      z.string().trim().regex(repostContentRecord)
    ], "invalid repost title").optional(),
  type: z.literal(RepostType.ExistingPost)
});

const FutureRepostSchema = z.object({
  id: z.uuidv4("post id is invalid"),
  type: z.literal(RepostType.FuturePost)
});

export const RepostSchema = z.object({
  data: z.discriminatedUnion("type", [
    PublishedRepostSchema,
    FutureRepostSchema,
  ], "invalid repost type"),
  ...RepostDataSchema.shape,
  scheduledDate: z.string().refine((date) => {
    try {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    } catch {
      return false;
    }
  }, "Invalid date format. Please use ISO 8601 format (e.g. 2024-12-14T07:17:05+01:00)"),
}).superRefine(({repostData}, ctx) => {
  if (repostData !== undefined) {
    const minimumHourValue = REPOSTING_TIME_INTERVAL / 60;
    if (repostData.hours < minimumHourValue) {
      ctx.addIssue({
        code: "custom",
        message: "Hour minimum value is not allowed",
        path: ["repostData"]
      });
    }
  }
});