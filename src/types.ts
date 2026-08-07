import type { BlobRef } from "@atproto/api";
import type { BatchItem } from "drizzle-orm/batch";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { Context } from "hono";
import type { ContextVariables } from "./auth";
import type { ScheduledContext } from "./classes/context";
import type { Post } from "./classes/post";
import type { Repost } from "./classes/repost";
import type { EmbedDataType, TaskType } from "./enums";

/*** Settings config wrappers for bindings ***/
interface ImageConfigSettings {
  enabled: boolean;
  steps?: number[];
  bucket_url?: string;
}

interface R2ConfigSettings {
  auto_prune: boolean;
  prune_days?: number;
}

interface QueueConfigSettings {
  enabled: boolean;
  repostsEnabled: boolean;
  threadEnabled: boolean;
  postNowEnabled?: boolean;
  pressure_retries?: boolean;
  delay_val: number;
  max_retries: number;
  post_queues: string[];
  repost_queues: string[];
}

export interface AgentConfigSettings {
  use_posts: boolean;
  use_reposts: boolean;
}

/** Types, types, types **/
export interface Bindings {
  DB: D1Database;
  R2: R2Bucket;
  R2RESIZE: R2Bucket;
  KV: KVNamespace;
  IMAGES: ImagesBinding;
  ASSETS?: Fetcher;
  POST_QUEUE: Queue;
  REPOST_QUEUE: Queue;
  QUEUE_SETTINGS: QueueConfigSettings;
  INVITE_POOL?: KVNamespace;
  IMAGE_SETTINGS: ImageConfigSettings;
  TASK_SETTINGS: AgentConfigSettings;
  R2_SETTINGS: R2ConfigSettings;
  POST_LIMITER: RateLimit;
  REPOST_LIMITER: RateLimit;
  ACCOUNT_UPDATE_LIMITER: RateLimit;
  ACCOUNT_LIMITER: RateLimit;
  REPOST_EDIT_LIMITER: RateLimit;
  REPOST_EDITOR_OPEN_LIMITER: RateLimit;
  DEFAULT_ADMIN_USER: string;
  DEFAULT_ADMIN_PASS: string;
  DEFAULT_ADMIN_BSKY_PASS: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  TURNSTILE_PUBLIC_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  RESIZE_SECRET_HEADER: string;
  RESET_BOT_USERNAME: string;
  RESET_BOT_APP_PASS: string;
  IN_DEV: "true"|"false"|undefined;
  CSP_REPORT_URL: string;
  IS_SSG: "true"|"false"|undefined;
};

export interface EmbedData {
  content: string;
  alt?: string;
  title?: string;
  uri?: string;
  type: EmbedDataType;
  description?: string;
  width?: number;
  height?: number;
  duration?: number;
  associatedRefs?: WebAssociatedRef[];
}

/// BSKY RECORDS & TYPES
export interface StrongRecordObject {
  uri: string;
  cid: string;
}
export type WebAssociatedRef = StrongRecordObject & {
  $type: "com.atproto.repo.strongRef";
};

export interface BskyEmbedRecord {
  "$type": "app.bsky.embed.record";
  record: StrongRecordObject
}

export type BskyEmbedWrapper = BskyEmptyEmbed|BskyVideoEmbed|BskyImgEmbed|BskyWebEmbed;

export interface BskyEmptyEmbed {
  type: EmbedDataType.None|EmbedDataType.Record;
  data?: undefined;
}

export interface BskyVideoEmbed {
  type: EmbedDataType.Video;
  data: BskyVideoRecordData
}

export interface BskyImgEmbed {
  type: EmbedDataType.Image;
  data?: BskyImageRecordData[];
}

export interface BskyWebEmbed {
  type: EmbedDataType.WebLink;
  data: BskyWebLinkRecordData;
}

export interface BskyRecordWrapper {
  cid?: string;
  uri?: string;
}

export interface BskyMediaAspectRatio {
  width: number;
  height: number;
}

export interface BskyImageRecordData {
  alt: string;
  image: BlobRef;
  aspectRatio?: BskyMediaAspectRatio;
}

export interface BskyVideoRecordData {
  blob: BlobRef;
  ar: BskyMediaAspectRatio;
  alt?: string;
}

export interface BskyWebLinkRecordData {
  uri: string;
  title: string;
  description: string;
  associatedRefs?: WebAssociatedRef[];
  thumb?: BlobRef;
}

export interface PDSService {
  type: string;
  serviceEndpoint: string;
}

export interface ProperD1Result extends Omit<D1Result, "success"> {
  success: boolean;
};

export interface PLCDirectoryResponse {
  service?: PDSService[]
}

// These are bsky responses to making posts
export type PostResponseObject = StrongRecordObject;

export type PostRecordResponse = PostResponseObject & {
  postID: string|null;
  embeds?: EmbedData[];
};

// Keeping track of the statuses of the posts that we made during a task operation
export interface PostStatus {
  records: PostRecordResponse[];
  // number of expected successes
  expected: number;
  // number of successes we got
  got: number;
}

/// APP RESPONSES
export interface CreateObjectResponse {
  ok: boolean;
  msg: string;
  postId?: string;
  rate_limited?: boolean;
}

export type CreatePostQueryResponse = CreateObjectResponse & {
  postNow?: boolean;
};

export interface DeleteResponse {
  success: boolean;
  isRepost: boolean;
  needsRefresh?: boolean;
}

/// MIDDLEWARES
export interface RequireAuthMiddlewareProps {
  returnHTML?: boolean;
  // if specified: logs out immediately
  // if not: logs out after 5 seconds
  forceLogout?: boolean;
}

/// USER WRAPPED DATA
export interface AccountUpdatePayload {
  username?: string;
  updatedSession?: boolean;
  password?: string;
}
export interface EditPostChanges {
  content: string;
  embedContent?: EmbedData[];
}

export type RepostIntakeData = {
  hours: number;
  times: number;
} | undefined;

/// R2
export interface R2BucketObject {
  name: string;
  user: string|null;
  date: Date
}

/// VIOLATIONS
export interface ViolationRecordChange {
  userPassInvalid?: boolean;
  accountSuspended?: boolean;
  mediaTooBig?: boolean;
  tosViolation?: boolean;
  takenDown?: boolean;
  accountGone?: boolean;
}

export type Violation = ViolationRecordChange & {
  userId: string;
  createdAt: string;
};

/// DATABASE
export type DBProcessor = DrizzleD1Database|null;
export type BatchQueryItem = BatchItem<"sqlite">;
export type BatchQueryArray = BatchQueryItem[];
export type BatchQuery = [BatchQueryItem, ...BatchQueryArray];

// Used for the pruning and database operations
export interface GetAllPostedBatch {
  id: string;
  uri: string|null;
}

export interface DBServiceLogin {
  user: string|null;
  pass: string;
  pds: string;
}

// Used for the file upload table so we can keep track of
// abandoned files from partial records
export interface FileListingRecord {
  createdAt?: Date;
  userId?: string;
}

/// RUNNERS
export interface QueueTaskData {
  type: TaskType;
  data: Post|Repost|null;
}

/// Contexts & Rendering
export type NextMiddleware = () => Promise<void>;
export interface HonoBase {
  Bindings: Bindings,
  Variables: ContextVariables
}

export type BaseContext = Context<HonoBase>;
export type AllContext = BaseContext|ScheduledContext;


export interface BaseElementProps {
  ctx?: AllContext
}
// handling preloading and injection of dependencies into the layout
export interface PreloadRules {
  type: "image"|"style"|"script"|"module";
  href: string;
  defer?: boolean;
  async?: boolean;
}

/// MISC
export type UserIdType = string|null;
export type LooseObj = Record<string, unknown>;
