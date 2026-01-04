import {BSKY_NAME_LOOKUP_LIMIT, BSKY_NAME_TYPE_AHEAD_CHARS, BSKY_GIF_MIME_TYPES,
  BSKY_IMG_MIME_TYPES, BSKY_VIDEO_MIME_TYPES, BSKY_VIDEO_LENGTH_LIMIT, 
  MAX_LENGTH, MAX_ALT_TEXT, R2_FILE_SIZE_LIMIT, MAX_THUMBNAIL_SIZE } from "../limits.d";

const makeFileTypeStr = (typeMap: string[]) => {
  return typeMap.map((type) => `"${type}"`).join()
};

export const CONST_SCRIPT_VERSION: number = 5;

export function makeConstScript() {
    return `const fileTypesSupported = [${makeFileTypeStr([...BSKY_IMG_MIME_TYPES, ...BSKY_VIDEO_MIME_TYPES, ...BSKY_GIF_MIME_TYPES])}];
const imageTypes = [${makeFileTypeStr(BSKY_IMG_MIME_TYPES)}];
const videoTypes = [${makeFileTypeStr(BSKY_VIDEO_MIME_TYPES)}];
const gifTypes = [${makeFileTypeStr(BSKY_GIF_MIME_TYPES)}];
const MAX_LENGTH=${MAX_LENGTH};
const MAX_ALT_LENGTH=${MAX_ALT_TEXT};
const MAX_VIDEO_LENGTH=${BSKY_VIDEO_LENGTH_LIMIT}; /* in seconds */
const MAX_AUTO_COMPLETE_NAMES=${BSKY_NAME_LOOKUP_LIMIT};
const MIN_CHAR_AUTO_COMPLETE_NAMES=${BSKY_NAME_TYPE_AHEAD_CHARS};
const FILE_DROP_MAX_SIZE=${R2_FILE_SIZE_LIMIT};
const FILE_DROP_MAX_THUMB_SIZE=${MAX_THUMBNAIL_SIZE};`;
}