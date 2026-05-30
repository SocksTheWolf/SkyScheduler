import * as z from "zod/v4";
import { atProtoPostURI, atProtoRecordURI } from "./regexCases";

const BaseRecordSchema = z.object({
  cid: z.string().trim().min(1).nonoptional("content id data must be provided"),
});

export const AnyRecordSchema = z.object({
  ...BaseRecordSchema.shape,
  uri: z.string().trim().min(1)
    .regex(atProtoRecordURI, "post record is invalid")
    .nonoptional("record uri must be provided"),
});

export const PostRecordSchema = z.object({
  ...BaseRecordSchema.shape,
  uri: z.string().trim().min(1)
    .regex(atProtoPostURI, "post record is invalid")
    .nonoptional("record uri must be provided"),
});

export const StrongRecordSchema = z.object({
  ...AnyRecordSchema.shape,
  $type: z.literal("com.atproto.repo.strongRef").nonoptional("missing strong record typing")
});
