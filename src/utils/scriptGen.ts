import {BSKY_NAME_LOOKUP_LIMIT,
  BSKY_IMG_MIME_TYPES, BSKY_VIDEO_MIME_TYPES, BSKY_VIDEO_LENGTH_LIMIT, 
  MAX_LENGTH} from "../limits.d";

const makeFileTypeStr = (typeMap: string[]) => {
  return typeMap.map((type) => `"${type}"`).join()
};

export function makeConstScript() {
    return `const fileTypesSupported = [${makeFileTypeStr([...BSKY_IMG_MIME_TYPES, ...BSKY_VIDEO_MIME_TYPES])}];
const imageTypes = [${makeFileTypeStr(BSKY_IMG_MIME_TYPES)}];
const videoTypes = [${makeFileTypeStr(BSKY_VIDEO_MIME_TYPES)}];
const MAX_LENGTH=${MAX_LENGTH};
const MAX_VIDEO_LENGTH=${BSKY_VIDEO_LENGTH_LIMIT};
const MAX_AUTO_COMPLETE_NAMES=${BSKY_NAME_LOOKUP_LIMIT};`
}