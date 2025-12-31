export const MIN_LENGTH: number = 1;
export const MAX_REPOST_INTERVAL: number = 10;
export const MAX_REPOST_DAYS: number = 7;
// Maximums used internally
export const MAX_REPOST_INTERVAL_LIMIT: number = MAX_REPOST_INTERVAL + 1;
export const MAX_REPOST_IN_HOURS: number = (MAX_REPOST_DAYS * 24) + 1;

// This is the length of how much we keep in the DB after a post has been made
export const MAX_POSTED_LENGTH: number = 50;

// Helper conversion math
export const TO_MB: number = 1024 * 1024;
export const TO_MiB: number = 1000 * 1000;
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
export const BSKY_IMG_FILE_EXTS: string[] = [
  "png",
  "jpg",
  "jpeg",
  "bmp",
  "webp",
  "heic",
  "svg"
];

// BSky limits that are inferred
export const BSKY_MIN_USERNAME_LENGTH: number = 4;
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
export const BSKY_VIDEO_FILE_EXTS: string[] = [
  "mp4",
  "m4v",
  "mp4v",
  "mpeg",
  "mpg",
  "m1v",
  "mp2",
  "m2v",
  "mov",
  "qt",
  "webm",
  "gif" /* This is handled in a special case because bluesky */
];

export const R2_FILE_SIZE_LIMIT_IN_MB: number = 100;
export const BSKY_IMG_SIZE_LIMIT: number = BSKY_IMG_SIZE_LIMIT_IN_MB * TO_MiB;
export const BSKY_VIDEO_SIZE_LIMIT: number = BSKY_VIDEO_MAX_SIZE_IN_MB * TO_MiB;
export const BSKY_VIDEO_LENGTH_LIMIT: number = BSKY_VIDEO_MAX_DURATION * TO_SEC;
export const R2_FILE_SIZE_LIMIT: number = R2_FILE_SIZE_LIMIT_IN_MB * TO_MB;
export const CF_FILE_SIZE_LIMIT_IN_MB: number = 70;
export const CF_FILE_SIZE_LIMIT: number = CF_FILE_SIZE_LIMIT_IN_MB * TO_MB;
export const CF_MAX_DIMENSION: number = 10000;

export const MIN_DASHBOARD_PASS: number = 8;
export const MAX_DASHBOARD_PASS: number = 30;

/* handle auto complete */
export const BSKY_NAME_LOOKUP_LIMIT: number = 6;
export const BSKY_NAME_TYPE_AHEAD_CHARS: number = 2;
