import remove from "just-remove";

/** APPLICATION CONFIGURATIONS **/
// minimum length of a post
export const MIN_LENGTH: number = 1; 
// max amount of times something can be reposted
export const MAX_REPOST_INTERVAL: number = 15;
// max amount of time something can be reposted over
export const MAX_REPOST_DAYS: number = 10;
// max amount of days to hold a post after it's been posted and has no reposts before it's purged from the DB
export const MAX_HOLD_DAYS_BEFORE_PURGE: number = 7;
// max length of an animated gif in minutes
export const MAX_GIF_LENGTH: number = 1;
// if gifs should be allowed to upload
export const GIF_UPLOAD_ALLOWED: boolean = false;

// This is the length of how much we keep in the DB after a post has been made
export const MAX_POSTED_LENGTH: number = 50;

// Dashboard password length settings
export const MIN_DASHBOARD_PASS: number = 8;
export const MAX_DASHBOARD_PASS: number = 30;

// max amount of returns from bsky handle search
export const BSKY_NAME_LOOKUP_LIMIT: number = 8; // 8 is the same value bsky uses
// number of characters to activate a bsky handle search
export const BSKY_NAME_TYPE_AHEAD_CHARS: number = 2;

// the maximum size of an image file to generate a thumbnail for, in MB.
// generation is done on client side using canvas elements.
export const MAX_THUMBNAIL_SIZE: number = 15;

// the maximum amount of repost posts an account can have at any one time.
// because some people went incredibly overboard.
export const MAX_REPOST_POSTS: number = 40;

/** INTERNAL LIMITS, DO NOT CHANGE **/
// Maximums used internally, do not change these directly.
export const MAX_REPOST_INTERVAL_LIMIT: number = MAX_REPOST_INTERVAL + 1;
export const MAX_REPOST_IN_HOURS: number = (MAX_REPOST_DAYS * 24) + 1;

// Helper conversion math
export const MB_TO_BYTES: number = 1000 * 1000;
export const TO_SEC: number = 60;
export const TO_MS: number = TO_SEC*1000;

// Max post length limit via
// https://github.com/bluesky-social/social-app/blob/b38013a12ff22a3ebd3075baa0d98bc96302a316/src/lib/constants.ts#L63
export const MAX_LENGTH: number = 300;

// Alt text limit via 
// https://github.com/bluesky-social/social-app/blob/b38013a12ff22a3ebd3075baa0d98bc96302a316/src/lib/constants.ts#L69
export const MAX_ALT_TEXT: number = 2000;

// Image limit values via 
// https://github.com/bluesky-social/social-app/blob/b38013a12ff22a3ebd3075baa0d98bc96302a316/src/lib/constants.ts#L97
export const BSKY_IMG_MAX_WIDTH: number = 2000;
export const BSKY_IMG_MAX_HEIGHT: number = 2000;
export const BSKY_IMG_SIZE_LIMIT_IN_MB: number = 1;
export const BSKY_IMG_MIME_TYPES: string[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/bmp",
  "image/avif",
  "image/svg+xml"
];

// Used for human readable display
export const BSKY_IMG_FILE_EXTS: string = [
  "png",
  "jpg",
  "jpeg",
  "bmp",
  "webp",
  "heic",
  "svg"
].join(", ");

// BSky limits that are inferred
export const BSKY_MIN_USERNAME_LENGTH: number = 4;
export const BSKY_MAX_USERNAME_LENGTH: number = 256; // since these are domains, they should be about 256
export const BSKY_MAX_APP_PASSWORD_LENGTH: number = 20;
export const MAX_EMBEDS_PER_POST: number = 4;

// Video limits values via
// https://github.com/bluesky-social/social-app/blob/b38013a12ff22a3ebd3075baa0d98bc96302a316/src/lib/constants.ts#L184
export const BSKY_VIDEO_MAX_DURATION: number = 3; // in minutes
export const BSKY_VIDEO_MAX_SIZE_IN_MB: number = 100;
export const BSKY_VIDEO_MIME_TYPES: string[] = [
  "video/mp4",
  "video/mpeg",
  "video/webm",
  "video/quicktime"
];

// Used for human readable display
export const BSKY_GIF_MIME_TYPES: string[] = [
  "image/gif"
];

// Used for human readable display
export const BSKY_VIDEO_FILE_EXTS: string = remove([
  "mp4",
  "mpeg",
  "mov",
  "webm",
   /* This is handled in a special case because bluesky */
  (GIF_UPLOAD_ALLOWED ? "animated gif" : undefined)
], [undefined]).join(", ");

// Max size of files that can go to R2 without doing multipart uploads
export const R2_FILE_SIZE_LIMIT_IN_MB: number = 100;
export const R2_FILE_SIZE_LIMIT: number = R2_FILE_SIZE_LIMIT_IN_MB * MB_TO_BYTES;
export const BSKY_IMG_SIZE_LIMIT: number = BSKY_IMG_SIZE_LIMIT_IN_MB * MB_TO_BYTES;
export const BSKY_VIDEO_SIZE_LIMIT: number = BSKY_VIDEO_MAX_SIZE_IN_MB * MB_TO_BYTES;
export const BSKY_VIDEO_LENGTH_LIMIT: number = BSKY_VIDEO_MAX_DURATION * TO_SEC;
export const MAX_GIF_LENGTH_LIMIT: number = MAX_GIF_LENGTH * TO_SEC;
// Max size of Cloudflare Images files
export const CF_IMAGES_FILE_SIZE_LIMIT_IN_MB: number = 70;
export const CF_IMAGES_FILE_SIZE_LIMIT: number = CF_IMAGES_FILE_SIZE_LIMIT_IN_MB * MB_TO_BYTES;
export const CF_IMAGES_MAX_DIMENSION: number = 10000;
