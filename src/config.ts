import { TimeIntervalSettings } from "./enums";

/*********************************************************/
/****            APPLICATION CONFIGURATIONS           ****/
/*********************************************************/

/** Account settings **/
/* ------------------ */
// if we should use captchas on most signup/forgot/etc fields
export const USE_CAPTCHA: boolean = true;

// if signups should be gated by the usage of invites
// set up the link to the invite keys in SITE_INVITE_URL in siteinfo
export const USE_INVITE_KEYS: boolean = false;

/** Render settings **/
/* ----------------- */
// if the support bar should be shown or not. Currently is only visible on the dashboard page
export const SHOW_SUPPORT_PROGRESS_BAR: boolean = true;

/** Storage settings **/
/* ------------------ */
// if we should truncate posted content
export const TRUNCATE_POSTED_CONTENT: boolean = false;

/** Default PDS Settings **/
/* ---------------------- */
// What is the default PDS to use (if one cannot be inferred for an user)
export const DEFAULT_PDS: string = "https://bsky.social";

// What is the default chat endpoint (probably needs to match with wherever your bot account is)
export const DEFAULT_CHAT_PDS: string = "https://bsky.social";

/** Security Settings **/
/* ------------------- */
// controls if we inject granular content security policy headers into requests
// or use the basic values from hono
export const USE_GRANULAR_CSP_SETTINGS: boolean = true;

// This will only report CSP failures
// Once CSP is good enough, change this to false to have it be enforced.
export const USE_CSP_REPORT_ONLY: boolean = false;

// if we should allow other websites/applications to make requests
// to our website.
export const ALLOW_CORS_ALL: boolean = false;

/** Media content **/
/* --------------- */
// if we can preview anything other than images.
// if true, we will early out any other content pulls (mostly videos)
export const PREVENT_NON_IMAGE_PREVIEWS: boolean = false;

/** Feature Settings **/
/* ------------------ */
// if the user can edit the repost rules for their posts
export const CAN_EDIT_REPOST_RULES: boolean = true;

// if users can repost scheduled posts before they are posted
export const CAN_REPOST_SCHEDULED_POSTS: boolean = true;

// if the openapi spec should be publicly accessible
export const PUBLIC_OPENAPI_SPEC: boolean = false;

/** Experimental Feature Flags **/
/* ---------------------------- */
// allow for deprecated image size parsing.
// NOTE: All new applications should set this to false.
export const USE_DEPRECATED_SIZE_PARSE: boolean = true;

// if we should try to use SSG rendering for pages vs dynamic rendering
export const USE_STATIC_HTML: boolean = true;

// if we should enable chrome speculation rules to speed up the site
export const ALLOW_SPECULATION_RULES: boolean = false;

/*********************************************************/
/****          APPLICATION INTERVAL SETTINGS          ****/
/*********************************************************/

// If these are changed from the default value of Hour (or have different values from each other),
// then you must also do the following:
//
// 1. Set the new crontab values in wrangler.toml
// 2. Modify handleSchedule in scheduler.ts to add a new switch case for the given action.
// 3. Add the appropriate call to what interval you would be handling (scheduleRepostTask, etc)

export const POSTING_TIME_INTERVAL: TimeIntervalSettings =
  TimeIntervalSettings.HalfHour;
// This is a cheaper/safer value to change around as reposts are very "free" in terms of processing power
// as there's no files that need to be uploaded or change
export const REPOSTING_TIME_INTERVAL: TimeIntervalSettings =
  TimeIntervalSettings.QuarterHour;