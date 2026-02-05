import isEmpty from "just-is-empty";
import * as z from "zod/v4";
import { BSKY_VIDEO_LENGTH_LIMIT } from "../limits";
import { EmbedDataType } from "../types.d";
import { FileContentSchema } from "./mediaSchema";
import { atpRecordURI } from "./regexCases";
import { AltTextSchema } from "./sharedValidations";

export const ImageEmbedSchema = z.object({
  ...FileContentSchema.shape,
  type: z.literal(EmbedDataType.Image),
  ...AltTextSchema.shape,
});

export const VideoEmbedSchema = z.object({
  ...FileContentSchema.shape,
  type: z.literal(EmbedDataType.Video),
  width: z.number("media width is not a number")
    .min(1, "media width value is below 1")
    .nonoptional("media width is required"),
  height: z.number("media height is not a number")
    .min(1, "media height value is below 1")
    .nonoptional("media height is required"),
  duration: z.number("media duration is invalid")
    .min(0, "media must be over 0 seconds long")
    .max(BSKY_VIDEO_LENGTH_LIMIT, `media must be less than ${BSKY_VIDEO_LENGTH_LIMIT} seconds long`)
    .nonoptional("media duration is required")
});

export const LinkEmbedSchema = z.object({
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
    message: "the link to embed failed to parse, is it accessible?",
    path: ["content"]
  }),
  type: z.literal(EmbedDataType.WebLink),
  title: z.string().trim().default(""),
  /* NOTE: uri is the link to the website here, 
    content is used as the thumbnail */
  uri: z.url({
    normalize: true, 
    protocol: /^https?$/,
    hostname: z.regexes.domain,
    error: "provided link is not an URL, please check URL and try again"
  }).trim()
    .nonoptional("link embeds require a url"),
  description: z.string().trim().default("")
});

export const PostRecordSchema = z.object({
  content: z.url({
    normalize: true,
    protocol: /^https?$/,
    hostname: z.regexes.domain,
    error: "post/feed/list record url is invalid"
  }).trim()
    .toLowerCase()
    .regex(atpRecordURI, "url is not a post/feed/list record")
    .nonoptional("post/feed/list records require a url"),
  type: z.literal(EmbedDataType.Record),
});