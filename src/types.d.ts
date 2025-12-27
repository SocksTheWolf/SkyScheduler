export interface Bindings {
  DB: D1Database;
  R2: R2Bucket;
  KV: KVNamespace;
  INVITE_POOL: KVNamespace;
  IMAGES: Images;  
  DEFAULT_ADMIN_USER: string;
  DEFAULT_ADMIN_PASS: string;
  DEFAULT_ADMIN_BSKY_PASS: string;
  USE_IMAGE_TRANSFORMS: boolean;
  MAX_IMAGE_QUALITY_STEPS: number;
  IMAGE_DEGRADE_PER_STEP: number;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  TURNSTILE_PUBLIC_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  USE_INVITE_KEYS: boolean;
  USE_TURNSTILE_CAPTCHA: boolean;
  USE_BSKY_IMAGE_DIMENSIONS: boolean;
  RESET_BOT_USERNAME: string;
  RESET_BOT_APP_PASS: string;
};

export enum EmbedDataType {
  None = 0,
  Image,
  WebLink
};

export type EmbedData = {
  content: string;
  alt?: string;
  title?: string;
  uri?: string;
  type?: EmbedDataType;
  description?: string;
};

export enum PostLabel {
  None = "None",
  Suggestive = "Suggestive",
  Nudity = "Nudity",
  Adult = "Adult",
  Graphic = "Graphic"
};

// Basically a copy of the schema
export type Post = {
  postid: string;
  // SkyScheduler User Id
  user: string;
  text: string;
  embeds?: EmbedData[];
  label: PostLabel;
  posted?: boolean;
  scheduledDate?: string;
  repostCount?: number;
  cid?: string;
  uri?: string;
};

export type Repost = {
  uri: string;
  cid: string;
  userId: string;
};

export type Violation = {
  userId: string;
  tosViolation: boolean;
  userPassInvalid: boolean;
  accountSuspended: boolean;
  accountGone: boolean;
  createdAt: string;
};

export type PostResponseObject = {
  uri: string;
  cid: string;
};

export interface LooseObj {
  [key: string]: any;
};

export enum PlatformLoginResponse {
  None = 0,
  Ok,
  Suspended,
  Deactivated,
  TakenDown,
  InvalidAccount,
  PlatformOutage,
  UnhandledError
};

export enum PWAutoCompleteSettings {
  Off,
  NewPass,
  CurrentPass
};