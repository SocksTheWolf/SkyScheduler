/*** Settings config wrappers for bindings ***/
type ImageConfigSettings = {
  enabled: boolean;
  steps?: number[];
  bucket_url?: string;
};

type SignupConfigSettings = {
  use_captcha: boolean;
  invite_only: boolean;
  invite_thread?: string;
  invite_uses: number;
};

type RedirectConfigSettings = {
  contact: string;
  tip: string;
};

type R2ConfigSettings = {
  auto_prune: boolean;
  prune_days?: number;
};

type QueueConfigSettings = {
  enabled: boolean;
  repostsEnabled: boolean;
  threadEnabled: boolean;
  postNowEnabled?: boolean;
  delay_val: number;
  post_queues: string[];
  repost_queues: string[];
};

export type AgentConfigSettings = {
  use_posts: boolean;
  use_reposts: boolean;
};

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