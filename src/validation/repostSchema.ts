import * as z from "zod/v4";
import { DateValidCheck, RepostType, TimeShape } from "../enums";
import { MAX_FUTURE_DATE_VALUE, MAX_REPOST_TITLE_LENGTH } from "../limits";
import { isDateValid } from "../utils/time";
import { PostRecordSchema } from "./recordSchema";
import {
  domainRegexCheck, httpProtoRecord,
  postRecordURI, repostContentRecord
} from "./regexCases";
import { RepostDataSchema } from "./repostDataSchema";
import { ScheduledDateSchema } from "./sharedSchemas";

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
  const dateResult: DateValidCheck = isDateValid(new Date(scheduledDate), TimeShape.Repost);
  // Ensure scheduled date is in the future
  if (dateResult === DateValidCheck.IsPastDate) {
    ctx.addIssue({
      code: "custom",
      message: "Scheduled repost date must be in the future",
      path: ["scheduledDate"]
    });
  } else if (dateResult === DateValidCheck.TooFutureDate) {
    ctx.addIssue({
      code: "custom",
      message: `Reposts can only be scheduled at a max of ${MAX_FUTURE_DATE_VALUE} years from now`,
      path: ["scheduledDate"]
    });
  }
});