import * as z from "zod/v4";
import {
  BSKY_GIF_MIME_TYPES,
  BSKY_IMG_MIME_TYPES,
  BSKY_VIDEO_MIME_TYPES, BSKY_VIDEO_SIZE_LIMIT,
  BSKY_VIDEO_SIZE_LIMIT_IN_MB, CF_IMAGES_FILE_SIZE_LIMIT,
  CF_IMAGES_FILE_SIZE_LIMIT_IN_MB, GIF_UPLOAD_ALLOWED,
  R2_FILE_SIZE_LIMIT, R2_FILE_SIZE_LIMIT_IN_MB
} from "../limits";

export const FileUploadSchema = z.object({
  file: z.file({error: "uploaded data is not a file"})
    .min(1, "invalid file size")
    .max(R2_FILE_SIZE_LIMIT, `max file size is ${R2_FILE_SIZE_LIMIT_IN_MB}MB`)
    .mime([...BSKY_IMG_MIME_TYPES, ...BSKY_VIDEO_MIME_TYPES,
      ... GIF_UPLOAD_ALLOWED ? BSKY_GIF_MIME_TYPES : []], "type not allowed")
    .superRefine((file, ctx) => {
      const fileType: string = file.type.toLowerCase();
      // Check image file restrictions
      if (BSKY_IMG_MIME_TYPES.includes(fileType)) {
        if (file.size > CF_IMAGES_FILE_SIZE_LIMIT) {
          ctx.addIssue({
            code: "custom",
            message: `max image upload size is ${CF_IMAGES_FILE_SIZE_LIMIT_IN_MB}MB`,
            path: ["file"]
          });
        }
      }
      // video file restrictions (also gifs if they are enabled)
      else if (BSKY_VIDEO_MIME_TYPES.includes(fileType) ||
        (GIF_UPLOAD_ALLOWED && BSKY_GIF_MIME_TYPES.includes(fileType)))
      {
        if (file.size > BSKY_VIDEO_SIZE_LIMIT) {
          ctx.addIssue({
            code: "custom",
            message: `max video size is ${BSKY_VIDEO_SIZE_LIMIT_IN_MB}MB`,
            path: ["file"]
          });
        }
      }
    }).nonoptional("missing file data")
});