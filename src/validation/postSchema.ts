import { isAfter } from "date-fns";
import isEmpty from "just-is-empty";
import * as z from "zod/v4";
import { POSTING_TIME_INTERVAL } from "../config";
import { EmbedDataType, PostLabel, TimeShape } from "../enums";
import {
  MAX_EMBEDS_PER_POST, MAX_IMAGES_PER_POST,
  MAX_LENGTH, MAX_RECORDS_PER_POST,
  MAX_VIDEOS_PER_POST, MAX_WEBLINKS_PER_POST,
  MIN_LENGTH
} from "../limits";
import { floorGivenTime } from "../utils/helpers";
import {
  ImageEmbedSchema, LinkEmbedSchema,
  PostRecordSchema, VideoEmbedSchema
} from "./embedSchema";
import { FileContentSchema } from "./mediaSchema";
import { RepostDataSchema } from "./repostDataSchema";
import { AltTextSchema, ScheduledDateSchema } from "./sharedValidations";

const TextContent = z.object({
  content: z.string().trim()
    .min(MIN_LENGTH,`post is too short, min ${MIN_LENGTH} characters`)
    .max(MAX_LENGTH, `post is over ${MAX_LENGTH} characters`)
    .nonempty("post content cannot be empty")
    .nonoptional("post content must be provided"),
});

// Schema for post creation
export const PostSchema = z.object({
  ...TextContent.shape,
  embeds: z.discriminatedUnion("type", [
    ImageEmbedSchema,
    LinkEmbedSchema,
    VideoEmbedSchema,
    PostRecordSchema
  ], "invalid media type").array().max(MAX_EMBEDS_PER_POST, "too many items were provided").optional(),
  contentLabel: z.enum(PostLabel, "content label must be set").optional(),
  makePostNow: z.boolean().default(false),
  rootPost: z.uuidv4("root post id is invalid").optional(),
  parentPost: z.uuidv4("parent post id is invalid").optional(),
  ...RepostDataSchema.shape,
  ...ScheduledDateSchema.shape,
}).superRefine(({embeds, contentLabel, scheduledDate, makePostNow, repostData, rootPost, parentPost}, ctx) => {
  // Threaded post checks
  if (!isEmpty(rootPost) && !isEmpty(parentPost)) {
    // Make post now is not allowed on threaded posts
    if (makePostNow) {
      ctx.addIssue({
        code: "custom",
        continue: false,
        message: "You cannot use the post now feature while making threads",
        path: ["makePostNow"]
      });
    }

    // make sure that repost data is explicitly missing for threads
    if (repostData !== undefined) {
      ctx.addIssue({
        code: "custom",
        continue: false,
        message: "You cannot have reposts on child posts of threads",
        path: ["repostData"]
      });
    }
  } else if (!makePostNow) {
    // If this is not a threaded post, and we are not doing a post now,
    // check that the post time is in the future
    if (!isAfter(floorGivenTime(new Date(scheduledDate), TimeShape.Post), new Date())) {
      ctx.addIssue({
        code: "custom",
        continue: false,
        message: "Scheduled posts must be set in the future",
        path: ["scheduledDate"]
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
  // Verify embed data
  if (embeds !== undefined && embeds.length > 0) {
    // Check if labels are set
    if (contentLabel === undefined) {
      // If we only have one record and it's a quote post, don't bother
      // checking for undefined labels or anything else in the refine
      if (embeds.length == 1 && embeds[0].type == EmbedDataType.Record) {
        return;
      }

      ctx.addIssue({
        code: "custom",
        continue: false,
        message: "Content labels are required for posting media",
        path: ["contentLabel"]
      });
    }

    // Count up the types of records we have
    let videoCount: number = 0, imageCount: number = 0,
      recordCount: number = 0, linkCount: number = 0,
      invalidCount: number = 0;

    // Build up a usage map of all of the items in the embed stack
    embeds.forEach((itm) => {
      switch(itm.type) {
        case EmbedDataType.Video:
          ++videoCount;
        break;
        case EmbedDataType.Image:
          ++imageCount;
        break;
        case EmbedDataType.Record:
          ++recordCount;
        break;
        case EmbedDataType.WebLink:
          ++linkCount;
        break;
        default:
          ++invalidCount;
        break;
      }
    });

    if (invalidCount > 0) {
      ctx.addIssue({
        code: "custom",
        message: "There is invalid data in this post, please remove",
        path: ["embeds"]
      });
    }

    // Check for video violations
    if (videoCount > 0) {
      // Cannot have videos and images in the same post
      if (imageCount > 0) {
        ctx.addIssue({
          code: "custom",
          message: "Videos and images cannot be uploaded to the same post",
          path: ["embeds"]
        });
      }
      if (videoCount > MAX_VIDEOS_PER_POST) {
        ctx.addIssue({
          code: "custom",
          message: "Only one video is allowed to be posted per post",
          path: ["embeds"]
        });
      }

      // Someone is being naughty if they get to this check
      if (linkCount > 0) {
        ctx.addIssue({
          code: "custom",
          message: "Embed links cannot be included with videos",
          path: ["embeds"]
        });
      }
    }

    // Check for image violations
    if (imageCount > 0) {
      if (imageCount > MAX_IMAGES_PER_POST) {
        ctx.addIssue({
          code: "custom",
          message: `Too many images have been included, the max is ${MAX_IMAGES_PER_POST}`,
          path: ["embeds"]
        });
      }

      // Someone is being naughty if they get to this check
      if (linkCount > 0) {
        ctx.addIssue({
          code: "custom",
          message: "Embed links cannot be included with images",
          path: ["embeds"]
        });
      }
    }

    // Check for number of post records
    if (recordCount > MAX_RECORDS_PER_POST) {
      ctx.addIssue({
        code: "custom",
        message: "Too many post records have been included",
        path: ["embeds"]
      });
    }

    // Check for number of post records
    if (linkCount > MAX_WEBLINKS_PER_POST) {
      ctx.addIssue({
        code: "custom",
        message: "Too many weblink embeds have been included",
        path: ["embeds"]
      });
    }
  }
});

export const EditSchema = z.object({
  ...TextContent.shape,
  altEdits: z.object({
    ...FileContentSchema.shape,
    ...AltTextSchema.shape
  }).array().max(MAX_EMBEDS_PER_POST, "too many items were provided").optional()
});