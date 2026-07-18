import { TimeIntervalSettings } from "./enums";

/*********************************************************/
/****            APPLICATION CONFIGURATIONS           ****/
/*********************************************************/

// minimum length of a post
export const MIN_LENGTH: number = 1;
// max amount of iterations a single repost rule can have
export const MAX_REPOST_INTERVAL: number = 15;
// max amount of time content can be reposted over
export const MAX_REPOST_DAYS: number = 10;
// max amount of posts per thread
export const MAX_POSTS_PER_THREAD: number = 10;
// the maximum amount of repost posts (content not made from the app) an account can have at any one time.
export const MAX_REPOST_POSTS: number = 40;
// a limit for the maximum number of repost rules a single post can have
export const MAX_REPOST_RULES_PER_POST: number = 7;
// Max length of a repost title
export const MAX_REPOST_TITLE_LENGTH: number = 100;

/** Storage settings **/
/* ------------------ */
// if we should truncate posted content
export const TRUNCATE_POSTED_CONTENT: boolean = false;
// How much of the content we keep in the DB after a post has been made.
// (Only if TRUNCATE_POSTED_CONTENT is true)
export const MAX_POSTED_LENGTH: number = 50;

// how long we should hold onto a posted post that has no additional updates (no reposts, etc)
export const MAX_HOLD_DAYS_BEFORE_PURGE: number = 7;

/** Account settings **/
/* ------------------ */
// Dashboard password length settings
export const MIN_DASHBOARD_PASS: number = 8;
export const MAX_DASHBOARD_PASS: number = 30;

export const USE_CAPTCHA: boolean = true;

// if signups should be gated by the usage of invites
// set up the link to the invite keys in SITE_INVITE_URL in siteinfo
export const USE_INVITE_KEYS: boolean = false;

/** Media content **/
/* --------------- */
// if gifs should be allowed to upload
export const GIF_UPLOAD_ALLOWED: boolean = false;
// max length of an animated gif in minutes
// gifs are big so this has a separate configurable setting
export const MAX_GIF_LENGTH: number = 1;

// if we can preview anything other than images
export const PREVENT_NON_IMAGE_PREVIEWS: boolean = false;
// the maximum size of an image file to generate a thumbnail for, in MB.
// generation is done on client side using canvas elements, so keep this low for mobile.
export const MAX_THUMBNAIL_SIZE: number = 15;

/** AutoSuggest Settings **/
/* ---------------------- */
// max amount of returns from bsky handle search
export const BSKY_NAME_LOOKUP_LIMIT: number = 8; // 8 is the same value bsky uses
// number of characters to activate a bsky handle search
export const BSKY_NAME_TYPE_AHEAD_CHARS: number = 2;

/** Default PDS Settings **/
/* ---------------------- */
// What is the default PDS to use (if one cannot be inferred for an user)
export const DEFAULT_PDS: string = "https://bsky.social";

// What is the default chat endpoint (probably needs to match with wherever your bot account is)
export const DEFAULT_CHAT_PDS: string = "https://bsky.social";

/** Feature Flags **/
/* --------------- */
// if the user can edit the repost rules for their posts
export const CAN_EDIT_REPOST_RULES: boolean = true;

// if users can repost scheduled posts before they are posted
export const CAN_REPOST_SCHEDULED_POSTS: boolean = true;

// allow for deprecated image size parsing.
// NOTE: All new applications should set this to false.
export const USE_DEPRECATED_SIZE_PARSE: boolean = true;

// controls if we inject granular content security policy headers into requests
// or use the basic values from hono
export const USE_GRANULAR_CSP_SETTINGS: boolean = true;
// the above must be on, otherwise this will do nothing. This will only report CSP failures
// Once CSP is good enough, change this to false to have it be enforced.
export const USE_CSP_REPORT_ONLY: boolean = true;

// if we should try to use SSG rendering for pages vs dynamic rendering
export const USE_STATIC_HTML: boolean = false;

/*********************************************************/
/****          APPLICATION INTERVAL SETTINGS          ****/
/*********************************************************/

// If these are changed from the default value of Hour (or have different values from each other),
// then you must also do the following:
//
// 1. Set the new crontab values in wrangler.toml
// 2. Modify handleSchedule in scheduler.ts to add a new switch case for the given action.
// 3. Add the appropriate call to what interval you would be handling (scheduleRepostTask, etc)

export const POSTING_TIME_INTERVAL: TimeIntervalSettings = TimeIntervalSettings.Hour;
// This is a cheaper/safer value to change around as reposts are very "free" in terms of processing power
// as there's no files that need to be uploaded or change
export const REPOSTING_TIME_INTERVAL: TimeIntervalSettings = TimeIntervalSettings.Hour;

/*********************************************************/
/**** INTERNAL/SERVICE LIMITS, DO NOT CHANGE DIRECTLY ****/
/*********************************************************/

// internal calculation values, pulled from above
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
// https://github.com/bluesky-social/social-app/blob/b236f274c3524a0e091a12741b6b3855ae9283ef/src/lib/constants.ts#L102
export const BSKY_IMG_SIZE_LIMIT_IN_MB: number = 2;
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
export const BSKY_IMG_FILE_EXTS_STR: string = [
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

// max amount of videos per post
export const MAX_VIDEOS_PER_POST: number = 1;
// max number of images per post
export const MAX_IMAGES_PER_POST: number = 10;
// max uploadable objects per post
export const MAX_FILES_PER_POST: number = Math.max(MAX_VIDEOS_PER_POST, MAX_IMAGES_PER_POST);
// max quote posts/lists/feeds per post
export const MAX_RECORDS_PER_POST: number = 1;
// max number of weblinks per post
export const MAX_WEBLINKS_PER_POST: number = 1;
// max extra data that can be added to a post
export const MAX_METADATA_PER_POST: number = Math.max(MAX_WEBLINKS_PER_POST, MAX_RECORDS_PER_POST);
// max amount of embed data per post object (you can have 1 extra data + the max amount of files)
export const MAX_EMBEDS_PER_POST: number = MAX_METADATA_PER_POST + MAX_FILES_PER_POST;

// Video limits values via
// https://github.com/bluesky-social/social-app/blob/b38013a12ff22a3ebd3075baa0d98bc96302a316/src/lib/constants.ts#L184
export const BSKY_VIDEO_MAX_DURATION: number = 3; // in minutes
// NOTE: this is still at 100MB due to reliability concerns, also we have no multipart upload support atm
// but dropzone technically could support it.
export const BSKY_VIDEO_MAX_SIZE_IN_MB: number = 100;
export const BSKY_VIDEO_MIME_TYPES: string[] = [
  "video/mp4",
  "video/mpeg",
  "video/webm",
  "video/quicktime"
];

export const BSKY_VIDEO_FILE_EXTS: string[] = [
  "mp4",
  "mpeg",
  "mov",
  "webm"
];

// Used for human readable display
export const BSKY_GIF_MIME_TYPES: string[] = [
  "image/gif"
];

// Used for human readable display
export const BSKY_VIDEO_FILES_STR: string = ((GIF_UPLOAD_ALLOWED) ?
  [...BSKY_VIDEO_FILE_EXTS, "animated gif"] : BSKY_VIDEO_FILE_EXTS).join(", ");

// Max size of files that can go to R2 without doing multipart uploads
export const R2_FILE_SIZE_LIMIT_IN_MB: number = 100;
export const R2_FILE_SIZE_LIMIT: number = R2_FILE_SIZE_LIMIT_IN_MB * MB_TO_BYTES;
export const BSKY_IMG_SIZE_LIMIT: number = BSKY_IMG_SIZE_LIMIT_IN_MB * MB_TO_BYTES;
export const BSKY_VIDEO_SIZE_LIMIT_IN_MB: number = Math.min(R2_FILE_SIZE_LIMIT_IN_MB, BSKY_VIDEO_MAX_SIZE_IN_MB);
export const BSKY_VIDEO_SIZE_LIMIT: number = BSKY_VIDEO_SIZE_LIMIT_IN_MB * MB_TO_BYTES;
export const BSKY_VIDEO_LENGTH_LIMIT: number = BSKY_VIDEO_MAX_DURATION * TO_SEC;
export const MAX_GIF_LENGTH_LIMIT: number = MAX_GIF_LENGTH * TO_SEC;
// Max size of Cloudflare Images files
export const CF_IMAGES_FILE_SIZE_LIMIT_IN_MB: number = 70;
export const CF_IMAGES_FILE_SIZE_LIMIT: number = CF_IMAGES_FILE_SIZE_LIMIT_IN_MB * MB_TO_BYTES;
export const CF_IMAGES_MAX_DIMENSION: number = 10000;
