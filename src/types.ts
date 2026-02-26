import { BatchItem } from "drizzle-orm/batch";
import { Context } from "hono";
import { ScheduledContext } from "./classes/context";
import { Post } from "./classes/post";
import { Repost } from "./classes/repost";

/*** Settings config wrappers for bindings ***/
type ImageConfigSettings = {
  enabled: boolean;
  steps?: number[];
  bucket_url?: string;
  max_width?: number;
};

type SignupConfigSettings = {
  use_captcha: boolean;
  invite_only: boolean;
  invite_thread?: string;
  invite_uses: number;
}

type RedirectConfigSettings = {
  contact: string;
  tip: string;
}

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
  SIGNUP_SETTINGS: SignupConfigSettings;
  TASK_SETTINGS: AgentConfigSettings;
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
  ENCRYPTED_PASS_KEY: string;
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

export enum PostLabel {
  None = "None",
  Suggestive = "Suggestive",
  Nudity = "Nudity",
  Adult = "Adult",
  Graphic = "Graphic",
  GraphicAdult = "GraphicAdult"
};

export enum TaskType {
  None,
  Blast,
  Post,
  Repost,
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

export type PostRecordResponse = PostResponseObject & {
  postID: string|null;
  embeds?: EmbedData[];
};

export type PostStatus = {
  records: PostRecordResponse[];
  // number of expected successes
  expected: number;
  // number of successes we got
  got: number;
};

export type DeleteResponse = {
  success: boolean;
  needsRefresh?: boolean;
}

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
  postId?: string;
};

export type CreatePostQueryResponse = CreateObjectResponse & {
  postNow?: boolean;
};

export type QueueTaskData = {
  type: TaskType;
  data: Post|Repost|null;
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

export type AllContext = Context|ScheduledContext;
export type BatchQuery = [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]];
