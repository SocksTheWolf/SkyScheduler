export const MIN_LENGTH: number = 1;
export const MAX_LENGTH: number = 300;
export const MAX_REPOST_INTERVAL: number = 11;

export const MAX_EMBEDS: number = 4;
// Alt text limit via 
// https://github.com/bluesky-social/social-app/blob/bb760400feaf4bab668fc2532a4de64e6833200a/src/lib/constants.ts#L64
export const MAX_ALT_TEXT: number = 2000;
// Image limit values via 
// https://github.com/bluesky-social/social-app/blob/bb760400feaf4bab668fc2532a4de64e6833200a/src/lib/constants.ts#L94
export const BSKY_MAX_WIDTH: number = 2000;
export const BSKY_MAX_HEIGHT: number = 2000;
export const BSKY_FILE_SIZE_LIMIT_IN_MB: number = 1;
export const BSKY_MIN_USERNAME_LENGTH: number = 4;
export const BSKY_MAX_APP_PASSWORD_LENGTH: number = 20;

export const TO_MB: number = 1024 * 1024;
export const TO_MiB: number = 1000 * 1000;
export const R2_FILE_SIZE_LIMIT_IN_MB: number = 100;
export const BSKY_FILE_SIZE_LIMIT: number = BSKY_FILE_SIZE_LIMIT_IN_MB * TO_MiB;
export const R2_FILE_SIZE_LIMIT: number = R2_FILE_SIZE_LIMIT_IN_MB * TO_MB;

export const MIN_DASHBOARD_PASS: number = 8;
export const MAX_DASHBOARD_PASS: number = 30;