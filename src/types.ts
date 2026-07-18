import { BatchItem } from "drizzle-orm/batch";
import { Context } from "hono";
import type { ContextVariables } from "./auth";
import type { AtProtoAgent } from "./classes/bskyAgents";
import { ScheduledContext } from "./classes/context";
import type { Post } from "./classes/post";
import type { Repost } from "./classes/repost";
import { EmbedDataType, TaskType } from "./enums";

/*** Settings config wrappers for bindings ***/
type ImageConfigSettings = {
  enabled: boolean;
  steps?: number[];
  bucket_url?: string;
  max_width?: number;
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
  VIDEO_WORKFLOW: Workflow<VideoWorkflowPayload>;
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
  CSP_REPORT_URL: string;
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

export type WebAssociatedRef = BskyRecordWrapper & {
  $type: "com.atproto.repo.strongRef";
};

export type Violation = {
  userId: string;
  tosViolation: boolean;
  userPassInvalid: boolean;
  accountSuspended: boolean;
  accountGone: boolean;
  takenDown: boolean;
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
  isRepost: boolean;
  needsRefresh?: boolean;
}

export interface LooseObj {
  [key: string]: any;
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
  rate_limited?: boolean;
};

export type CreatePostQueryResponse = CreateObjectResponse & {
  postNow?: boolean;
};

export type QueueTaskData = {
  type: TaskType;
  data: Post|Repost|null;
};

// Workflow types
export type VideoWorkflowPayload = {
  agent: AtProtoAgent;
  post: Post;
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

export type HonoBase = { Bindings: Bindings, Variables: ContextVariables };

export type BaseContext = Context<HonoBase>;
export type AllContext = BaseContext|ScheduledContext;
export type BatchQuery = [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]];

export type BaseElementProps = {
  ctx?: AllContext
};
// handling preloading and injection of dependencies into the layout
export type PreloadRules = {
  type: "image"|"style"|"script"|"module"|string;
  href: string;
};
