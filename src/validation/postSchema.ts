import { MAX_ALT_TEXT, MIN_LENGTH, MAX_REPOST_INTERVAL, MAX_HOURS_REPOSTING } from "../limits.d";
import { EmbedDataType, PostLabel } from "../types.d";
import { fileKeyRegex } from "./regexCases";
import * as z from "zod/v4";
import isEmpty from "just-is-empty";

const ImageEmbedSchema = z.object({
  content: z.string().nonempty().regex(fileKeyRegex, "file key for embed is invalid"),
  type: z.literal(EmbedDataType.Image).optional(),
  alt: z.string().max(MAX_ALT_TEXT, "alt text is too long"),
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

// Schema for post creation
export const PostSchema = z.object({
  content: z.string().trim().min(MIN_LENGTH, "post is too short").nonempty("post cannot be empty"),
  embeds: z.discriminatedUnion("type", [
    ImageEmbedSchema,
    LinkEmbedSchema
  ]).array().optional(),
  label: z.nativeEnum(PostLabel).optional(),
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

export const EditSchema = z.object({
  content: z.string().trim().min(MIN_LENGTH, "post is too short").nonempty("post cannot be empty")
});