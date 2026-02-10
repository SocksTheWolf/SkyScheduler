import { BatchItem } from "drizzle-orm/batch";
import { ExecutionContext } from "hono";

/*** Settings config wrappers for bindings ***/
type ImageConfigSettings = {
  enabled: boolean;
  steps: number[];
  bucket_url: string;
};

type SignupConfigSettings = {
  use_captcha: boolean;
  invite_only: boolean;
  invite_thread: string;
}

type RedirectConfigSettings = {
  contact: string;
  tip: string;
}

type R2ConfigSettings = {
  auto_prune: boolean;
  prune_days: number;
}

type QueueConfigSettings = {
  enabled: boolean;
  postNowEnabled?: boolean;
  post_queues: string[];
  repost_queues: string[];
}

/** Types, types, types **/
export interface Bindings {
  DB: D1Database;
  R2: R2Bucket;
  R2RESIZE: R2Bucket;
  KV: KVNamespace;
  IMAGES: ImagesBinding;
  POST_QUEUE1: Queue;
  REPOST_QUEUE: Queue;
  QUEUE_SETTINGS: QueueConfigSettings;
  INVITE_POOL: KVNamespace;
  IMAGE_SETTINGS: ImageConfigSettings;
  SIGNUP_SETTINGS: SignupConfigSettings;
  R2_SETTINGS: R2ConfigSettings;
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
  IN_DEV: boolean;
  REDIRECTS: RedirectConfigSettings;
};

export enum EmbedDataType {
  None = 0,
  Image = 1,
  WebLink = 2,
  Video = 3,
  Record = 4,
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
};

// Contains the repost info for a post
export type RepostInfo = {
  guid: string,
  time: Date,
  hours: number,
  count: number
};

export enum PostLabel {
  None = "None",
  Suggestive = "Suggestive",
  Nudity = "Nudity",
  Adult = "Adult",
  Graphic = "Graphic",
  GraphicAdult = "GraphicAdult"
};

// Basically a copy of the schema
export type Post = {
  // guid for post
  postid: string;
  // SkyScheduler User Id
  user: string;
  // post data
  text: string;
  embeds?: EmbedData[];
  label: PostLabel;
  // post flags
  postNow: boolean;
  posted?: boolean;
  isRepost?: boolean;
  // repost metadata
  repostInfo?: RepostInfo[];
  scheduledDate?: string;
  repostCount?: number;
  // atproto data
  cid?: string;
  uri?: string;
  // thread data
  rootPost?: string;
  parentPost?: string;
};

export type Repost = {
  postid: string;
  uri: string;
  cid: string;
  userId: string;
  scheduleGuid?: string;
};

export enum QueueTaskType {
  None,
  Post,
  Repost,
};

export type QueueTaskData = {
  type: QueueTaskType;
  post?: Post;
  repost?: Repost;
};

export type Violation = {
  userId: string;
  tosViolation: boolean;
  userPassInvalid: boolean;
  accountSuspended: boolean;
  accountGone: boolean;
  mediaTooBig: boolean;
  createdAt: string;
};

export type PostResponseObject = {
  uri: string;
  cid: string;
};

export interface LooseObj {
  [key: string]: any;
};

export enum AccountStatus {
  None = 0,
  Ok,
  Suspended,
  Deactivated,
  TakenDown,
  InvalidAccount,
  PlatformOutage,
  MediaTooBig,
  UnhandledError,
  TOSViolation,
};

export enum PWAutoCompleteSettings {
  Off,
  NewPass,
  CurrentPass
};

export type PreloadRules = {
  type: string;
  href: string;
};

export type ScheduledContext = {
  executionCtx: ExecutionContext;
  env: Bindings;
};

export type BskyEmbedWrapper = {
  type: EmbedDataType;
  data?: any;
};

export type BskyRecordWrapper = {
  cid?: string;
  uri?: string;
};

export type CreateObjectResponse = {
  ok: boolean;
  msg: string;
};

export type CreatePostQueryResponse = CreateObjectResponse & {
  postNow?: boolean;
  postId?: string;
};

export type BskyAPILoginCreds = {
  pds: string;
  username: string;
  password: string;
  valid: boolean;
};

// Used for the pruning and database operations
export type GetAllPostedBatch = {
  id: string; 
  uri: string|null;
};

export type R2BucketObject = {
  name: string;
  user: string|null;
  date: Date
}

export type BatchQuery = [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]];