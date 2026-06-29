import remove from "just-remove";
import { TimeIntervalSettings } from "./enums";

/*********************************************************/
/****            APPLICATION CONFIGURATIONS           ****/
/*********************************************************/

// minimum length of a post
export const MIN_LENGTH: number = 1;
// max amount of times something can be reposted
export const MAX_REPOST_INTERVAL: number = 15;
// max amount of time something can be reposted over
export const MAX_REPOST_DAYS: number = 10;
// if gifs should be allowed to upload
export const GIF_UPLOAD_ALLOWED: boolean = false;
// max length of an animated gif in minutes
export const MAX_GIF_LENGTH: number = 1; // gifs are big so this has a separate configurable setting
// if we can preview anything other than images
export const PREVENT_NON_IMAGE_PREVIEWS: boolean = false;
// max posts per thread
export const MAX_POSTS_PER_THREAD: number = 10;
// the maximum amount of repost posts (content not made from the app) an account can have at any one time.
export const MAX_REPOST_POSTS: number = 40;
// a limit for the maximum number of repost rules a single post can have
export const MAX_REPOST_RULES_PER_POST: number = 5;

// if we should truncate posted content
export const TRUNCATE_POSTED_CONTENT: boolean = false;
// This is the length of how much we keep in the DB after a post has been made.
// Only if TRUNCATE_POSTED_CONTENT is true
export const MAX_POSTED_LENGTH: number = 50;
// Max length of a repost title
export const MAX_REPOST_TITLE_LENGTH: number = 100;

// how long we should hold onto a posted post that has no additional updates (no reposts, etc)
export const MAX_HOLD_DAYS_BEFORE_PURGE: number = 7;

// Dashboard password length settings
export const MIN_DASHBOARD_PASS: number = 8;
export const MAX_DASHBOARD_PASS: number = 30;

/** AutoSuggest Settings **/
// max amount of returns from bsky handle search
export const BSKY_NAME_LOOKUP_LIMIT: number = 8; // 8 is the same value bsky uses
// number of characters to activate a bsky handle search
export const BSKY_NAME_TYPE_AHEAD_CHARS: number = 2;

// the maximum size of an image file to generate a thumbnail for, in MB.
// generation is done on client side using canvas elements, so keep this low for mobile.
export const MAX_THUMBNAIL_SIZE: number = 15;

// if the user can edit the repost rules for their posts
export const CAN_EDIT_REPOST_RULES: boolean = true;

// if users can repost scheduled posts before they are posted
export const CAN_REPOST_SCHEDULED_POSTS: boolean = true;

// if we should use CF Workflows in order to handle video uploads when scheduled
// NOTE: This currently does not work properly, and should only be set to true while testing
export const USE_VIDEO_WORKFLOWS: boolean = false;

// allow for deprecated image size parsing.
// NOTE: New applications should set this to false.
export const USE_DEPRECATED_SIZE_PARSE: boolean = true;

/*********************************************************/
/****          APPLICATION INTERVAL SETTINGS          ****/
/*********************************************************/

// If these are changed from the default value of Hour (or have different values from each other),
// then you must also do the following:
//
// 1. Set the new crontab values in wrangler.toml
// 2. Modify handleSchedule in scheduler.ts to add a new switch case for the given action.
// 3. Add the appropriate call to what interval you would be handling (scheduleRepostTask, etc)
// 4. Remove any scheduleAllContentTasks

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
export const MAX_EMBEDS_PER_POST: number = 10;

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
export const BSKY_VIDEO_SIZE_LIMIT: number = Math.min(R2_FILE_SIZE_LIMIT_IN_MB, BSKY_VIDEO_MAX_SIZE_IN_MB) * MB_TO_BYTES;
export const BSKY_VIDEO_LENGTH_LIMIT: number = BSKY_VIDEO_MAX_DURATION * TO_SEC;
export const MAX_GIF_LENGTH_LIMIT: number = MAX_GIF_LENGTH * TO_SEC;
// Max size of Cloudflare Images files
export const CF_IMAGES_FILE_SIZE_LIMIT_IN_MB: number = 70;
export const CF_IMAGES_FILE_SIZE_LIMIT: number = CF_IMAGES_FILE_SIZE_LIMIT_IN_MB * MB_TO_BYTES;
export const CF_IMAGES_MAX_DIMENSION: number = 10000;
