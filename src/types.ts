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
type ImageConfigSettings = {
  enabled: boolean;
  steps?: number[];
  bucket_url?: string;
};

type R2ConfigSettings = {
  auto_prune: boolean;
  prune_days?: number;
}

type QueueConfigSettings = {
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

export type AgentConfigSettings = {
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

export type EmbedData = {
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
};

/// BSKY RECORDS & TYPES
export type WebAssociatedRef = BskyRecordWrapper & {
  $type: "com.atproto.repo.strongRef";
};

export type BskyEmbedRecord = {
  "$type": "app.bsky.embed.record";
  record: BskyRecordWrapper
};

export type BskyEmbedWrapper = BskyEmptyEmbed|BskyVideoEmbed|BskyImgEmbed|BskyWebEmbed;

export type BskyEmptyEmbed = {
  type: EmbedDataType.None|EmbedDataType.Record;
  data?: undefined;
};

export type BskyVideoEmbed = {
  type: EmbedDataType.Video;
  data: BskyVideoRecordData
};

export type BskyImgEmbed = {
  type: EmbedDataType.Image;
  data?: BskyImageRecordData[];
};

export type BskyWebEmbed = {
  type: EmbedDataType.WebLink;
  data: BskyWebLinkRecordData;
};

export type BskyRecordWrapper = {
  cid?: string;
  uri?: string;
};

export type BskyMediaAspectRatio = {
  width: number;
  height: number;
};

export type BskyImageRecordData = {
  alt?: string;
  image: BlobRef;
  aspectRatio?: BskyMediaAspectRatio;
};

export type BskyVideoRecordData = {
  blob: BlobRef;
  ar: BskyMediaAspectRatio;
  alt?: string;
};

export type BskyWebLinkRecordData = {
  uri: string;
  title?: string;
  description?: string;
  associatedRefs?: WebAssociatedRef[];
  thumb?: BlobRef;
};

export type PDSService = {
  type: string;
  serviceEndpoint: string;
};

export interface ProperD1Result extends Omit<D1Result, "success"> {
  success: boolean;
};

export type PLCDirectoryResponse = {
  service?: PDSService[]
};

// These are bsky responses to making posts
export type PostResponseObject = {
  uri: string;
  cid: string;
};

export type PostRecordResponse = PostResponseObject & {
  postID: string|null;
  embeds?: EmbedData[];
};

// Keeping track of the statuses of the posts that we made during a task operation
export type PostStatus = {
  records: PostRecordResponse[];
  // number of expected successes
  expected: number;
  // number of successes we got
  got: number;
};

/// APP RESPONSES
export type CreateObjectResponse = {
  ok: boolean;
  msg: string;
  postId?: string;
  rate_limited?: boolean;
};

export type CreatePostQueryResponse = CreateObjectResponse & {
  postNow?: boolean;
};

export type DeleteResponse = {
  success: boolean;
  isRepost: boolean;
  needsRefresh?: boolean;
};

/// MIDDLEWARES
export type RequireAuthMiddlewareProps = {
  returnHTML?: boolean;
  // if specified: logs out immediately
  // if not: logs out after 5 seconds
  forceLogout?: boolean;
};

/// USER WRAPPED DATA
export type AccountUpdatePayload = {
  username?: string;
  updatedSession?: boolean;
  password?: string;
};
export type EditPostChanges = {
  content: string;
  embedContent?: EmbedData[];
};

export type RepostIntakeData = {
  hours: number;
  times: number;
} | undefined;

/// R2
export type R2BucketObject = {
  name: string;
  user: string|null;
  date: Date
};

/// VIOLATIONS
export type ViolationRecordChange = {
  userPassInvalid?: boolean;
  accountSuspended?: boolean;
  mediaTooBig?: boolean;
  tosViolation?: boolean;
  takenDown?: boolean;
  accountGone?: boolean;
};

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
export type GetAllPostedBatch = {
  id: string;
  uri: string|null;
};

export type DBServiceLogin = {
  user: string|null;
  pass: string;
  pds: string;
}

// Used for the file upload table so we can keep track of
// abandoned files from partial records
export type FileListingRecord = {
  createdAt?: Date;
  userId?: string;
};

/// RUNNERS
export type QueueTaskData = {
  type: TaskType;
  data: Post|Repost|null;
};

/// Contexts & Rendering
export type NextMiddleware = () => Promise<void>;
export type HonoBase = { Bindings: Bindings, Variables: ContextVariables };

export type BaseContext = Context<HonoBase>;
export type AllContext = BaseContext|ScheduledContext;


export type BaseElementProps = {
  ctx?: AllContext
};
// handling preloading and injection of dependencies into the layout
export type PreloadRules = {
  type: "image"|"style"|"script"|"module";
  href: string;
  defer?: boolean;
  async?: boolean;
};

/// MISC
export type UserIdType = string|null;
export type LooseObj = Record<string, unknown>;
