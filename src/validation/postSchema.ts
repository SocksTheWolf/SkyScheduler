import * as z from "zod/v4";
import { EmbedDataType, PostLabel } from "../enums";
import { MAX_LENGTH, MIN_LENGTH, POSTING_TIME_INTERVAL } from "../limits";
import { ImageEmbedSchema, LinkEmbedSchema, PostRecordSchema, VideoEmbedSchema } from "./embedSchema";
import { FileContentSchema } from "./mediaSchema";
import { RepostDataSchema } from "./repostDataSchema";
import { AltTextSchema } from "./sharedValidations";

const TextContent = z.object({
  content: z.string().trim()
    .min(MIN_LENGTH,`post is too short, min ${MIN_LENGTH} characters`)
    .max(MAX_LENGTH, `post is over ${MAX_LENGTH} characters`)
    .nonempty("post cannot be empty"),
});

// Schema for post creation
export const PostSchema = z.object({
  ...TextContent.shape,
  embeds: z.discriminatedUnion("type", [
    ImageEmbedSchema,
    LinkEmbedSchema,
    VideoEmbedSchema,
    PostRecordSchema
  ], "invalid media type").array().optional(),
  label: z.enum(PostLabel, "content label must be set").optional(),
  makePostNow: z.boolean().default(false),
  rootPost: z.uuidv4("root post id is invalid").optional(),
  parentPost: z.uuidv4("parent post id is invalid").optional(),
  ...RepostDataSchema.shape,
  scheduledDate: z.string().refine((date) => {
    try {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    } catch {
      return false;
    }
  }, "Invalid date format. Please use ISO 8601 format (e.g. 2024-12-14T07:17:05+01:00)"),
}).superRefine(({embeds, label, makePostNow, repostData, rootPost, parentPost}, ctx) => {
  // check that root and parentpost are unset if makePostNow is set
  if (rootPost !== undefined && parentPost !== undefined) {
    if (makePostNow) {
      ctx.addIssue({
        code: "custom",
        message: "You cannot use the post now feature while making threads",
        path: ["makePostNow"]
      });
    }

    if (repostData !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "You cannot have reposts on child posts of threads",
        path: ["repostData"]
      });
    }
  }
  // if we have repostData, check that the minimum is acceptable
  if (repostData !== undefined) {
    const minimumHourValue = POSTING_TIME_INTERVAL / 60;
    if (repostData.hours < minimumHourValue) {
      ctx.addIssue({
        code: "custom",
        message: "Hour minimum value is not allowed",
        path: ["repostData"]
      });
    }
  }
  // Check that labels are properly set if we have embed data
  if (embeds !== undefined && embeds.length > 0 && label === undefined) {
    // If it's only a quote post and nothing else, then no content label is required.
    if (embeds.length == 1 && embeds[0].type == EmbedDataType.Record)
      return;

    ctx.addIssue({
      code: "custom",
      message: "Content labels are required for posting media",
      path: ["label"]
    });
  }
});

export const EditSchema = z.object({
  ...TextContent.shape,
  altEdits: z.object({
    ...FileContentSchema.shape,
    ...AltTextSchema.shape
  }).array().optional()
});