import { MAX_ALT_TEXT, MIN_LENGTH, MAX_REPOST_INTERVAL, 
  MAX_HOURS_REPOSTING, MAX_LENGTH, BSKY_VIDEO_LENGTH_LIMIT } from "../limits.d";
import { EmbedDataType, PostLabel } from "../types.d";
import { fileKeyRegex } from "./regexCases";
import * as z from "zod/v4";
import isEmpty from "just-is-empty";

const ImageEmbedSchema = z.object({
  content: z.string().nonempty().toLowerCase().regex(fileKeyRegex, "file key for embed is invalid"),
  type: z.literal(EmbedDataType.Image).optional(),
  alt: z.string().trim().max(MAX_ALT_TEXT, "alt text is too long").prefault(""),
});

const VideoEmbedSchema = z.object({
  content: z.string().nonempty().regex(fileKeyRegex, "file key for embed is invalid"),
  type: z.literal(EmbedDataType.Video),
  width: z.number("video width is not a number")
    .min(0, "width value is below 0")
    .nonoptional("video width is required"),
  height: z.number("video height is not a number")
    .min(0, "height value is below 0")
    .nonoptional("video height is required"),
  duration: z.number("video duration is invalid")
    .min(1, "video must be at least 1 second long")
    .max(BSKY_VIDEO_LENGTH_LIMIT, `videos must be less than ${BSKY_VIDEO_LENGTH_LIMIT} seconds long`)
    .nonoptional("video duration is required")
});

const LinkEmbedSchema = z.object({
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
  uri: z.url({
    normalize: true, 
    protocol: /^https?$/,
    hostname: z.regexes.domain,
    error: "provided weblink is not in the correct form of an url"}).trim().default(""),
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
  ]).array().optional(),
  label: z.nativeEnum(PostLabel, "content label must be set").optional(),
  makePostNow: z.boolean().default(false),
  repostData: z.object({
    hours: z.coerce.number().min(1).max(MAX_HOURS_REPOSTING),
    times: z.coerce.number().min(1).max(MAX_REPOST_INTERVAL)
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

export const EditSchema = TextContent;