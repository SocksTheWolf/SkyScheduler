import { isAfter } from "date-fns";
import * as z from "zod/v4";
import { RepostType, TimeShape } from "../enums";
import { MAX_REPOST_TITLE_LENGTH } from "../limits";
import { floorGivenTime } from "../utils/helpers";
import { PostRecordSchema } from "./recordSchema";
import {
  domainRegexCheck, httpProtoRecord,
  postRecordURI, repostContentRecord
} from "./regexCases";
import { RepostDataSchema } from "./repostDataSchema";
import { ScheduledDateSchema } from "./sharedValidations";

const PublishedRepostSchema = z.object({
  ...PostRecordSchema.shape,
  url: z.url({
    normalize: true,
    protocol: httpProtoRecord,
    hostname: domainRegexCheck,
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
  ...ScheduledDateSchema.shape,
}).superRefine(({scheduledDate}, ctx) => {
  const scheduleDate = floorGivenTime(new Date(scheduledDate), TimeShape.Repost);
  // Ensure scheduled date is in the future
  if (!isAfter(scheduleDate, new Date())) {
    ctx.addIssue({
      code: "custom",
      message: "Scheduled repost date must be in the future",
      path: ["scheduledDate"]
    });
  }
});