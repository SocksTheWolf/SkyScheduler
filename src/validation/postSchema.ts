import { MAX_ALT_TEXT, MIN_LENGTH, MAX_REPOST_INTERVAL_LIMIT, 
  MAX_REPOST_IN_HOURS, MAX_LENGTH, BSKY_VIDEO_LENGTH_LIMIT } from "../limits.d";
import { EmbedDataType, PostLabel } from "../types.d";
import { FileContentSchema } from "./mediaSchema";
import * as z from "zod/v4";
import isEmpty from "just-is-empty";

const AltTextSchema = z.object({
  alt: z.string().trim().max(MAX_ALT_TEXT, "alt text is too long").prefault("")
});

const ImageEmbedSchema = z.object({
  ...FileContentSchema.shape,
  type: z.literal(EmbedDataType.Image),
  ...AltTextSchema.shape,
});

const VideoEmbedSchema = z.object({
  ...FileContentSchema.shape,
  type: z.literal(EmbedDataType.Video),
  width: z.number("media width is not a number")
    .min(0, "media width value is below 0")
    .nonoptional("media width is required"),
  height: z.number("media height is not a number")
    .min(0, "media height value is below 0")
    .nonoptional("media height is required"),
  duration: z.number("media duration is invalid")
    .min(0, "media must be over 0 seconds long")
    .max(BSKY_VIDEO_LENGTH_LIMIT, `media must be less than ${BSKY_VIDEO_LENGTH_LIMIT} seconds long`)
    .nonoptional("media duration is required")
});

const LinkEmbedSchema = z.object({
  /* content is the thumbnail */
  content: z.string().trim().prefault("").refine((value) => { 
    if (isEmpty(value))
      return true;
    // So the idea here is to try to encode the string into an URL object, and if that fails
    // then you just fail out the string.
    try {
      const urlWrap = new URL(value);
      return urlWrap.protocol === "https:" || urlWrap.protocol === "http:";
    } catch (err) {
      return false;
    }
  }, {
    message: "The link embed contained invalid data, please check your URL and try again",
    path: ["content"]
  }),
  type: z.literal(EmbedDataType.WebLink),
  title: z.string().trim().default(""),
  /* uri is the link to the website */
  uri: z.url({
    normalize: true, 
    protocol: /^https?$/,
    hostname: z.regexes.domain,
    error: "provided weblink is not in the correct form of an url"}).trim().nonoptional("link embeds require a url"),
  description: z.string().trim().default("")
});

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
    VideoEmbedSchema
  ], "invalid media type").array().optional(),
  label: z.nativeEnum(PostLabel, "content label must be set").optional(),
  makePostNow: z.boolean().default(false),
  repostData: z.object({
    hours: z.coerce.number().min(1).max(MAX_REPOST_IN_HOURS),
    times: z.coerce.number().min(1).max(MAX_REPOST_INTERVAL_LIMIT)
  }).optional(),
  scheduledDate: z.string().refine((date) => {
    try {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    } catch {
      return false;
    }
  }, "Invalid date format. Please use ISO 8601 format (e.g. 2024-12-14T07:17:05+01:00)"),
}).superRefine(({embeds, label}, ctx) => {
  if (embeds !== undefined && embeds.length > 0 && label === undefined) {
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