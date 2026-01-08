import {
  BSKY_GIF_MIME_TYPES,
  BSKY_IMG_MIME_TYPES,
  BSKY_NAME_LOOKUP_LIMIT, BSKY_NAME_TYPE_AHEAD_CHARS,
  BSKY_VIDEO_LENGTH_LIMIT,
  BSKY_VIDEO_MIME_TYPES,
  MAX_ALT_TEXT,
  MAX_EMBEDS_PER_POST,
  MAX_LENGTH,
  MAX_THUMBNAIL_SIZE,
  R2_FILE_SIZE_LIMIT
} from "../limits.d";
import { PreloadRules } from "../types.d";

const CONST_SCRIPT_VERSION: number = 6;

const makeFileTypeStr = (typeMap: string[]) => {
  return typeMap.map((type) => `"${type}"`).join()
};

export const ConstScriptPreload: PreloadRules[] = [
  {type: "script", href: `/js/consts.js?v=${CONST_SCRIPT_VERSION}`}, 
];

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
const FILE_DROP_MAX_THUMB_SIZE=${MAX_THUMBNAIL_SIZE};
const FILE_DROP_MAX_FILES=${MAX_EMBEDS_PER_POST};`;
}