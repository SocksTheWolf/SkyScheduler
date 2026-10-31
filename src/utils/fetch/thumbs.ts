import isEmpty from "just-is-empty";
import { BSKY_IMG_FILE_EXTS, BSKY_THUMB_SIZE_LIMIT } from "../../limits";
import type { AllContext, ThumbData } from "../../types";

export const fetchThumb = async (c: AllContext, url: string): Promise<ThumbData> => {
  const response: ThumbData = {
    success: false
  };

  if (isEmpty(url)) {
    return response;
  }

  const thumbnail = await fetch(url);
  if (thumbnail.ok) {
    response.data = await thumbnail.blob();
    response.encoding = thumbnail.headers.get("content-type") ?? "image/png";
    if (response.data.size > BSKY_THUMB_SIZE_LIMIT) {
      // Resize the thumbnail because while the blob service will accept
      // embed thumbnails of any size it will fail when you try to make the post record
      // with the error that the post record is invalid.
      const imgTransform = (await c.env.IMAGES.input(response.data.stream() as ReadableStream<Uint8Array>)
        .transform({width: 1280, height: 720, fit: "scale-down"})
        .output({ format: "image/jpeg", quality: 85 })).response();
      if (imgTransform.ok) {
        response.encoding = "image/jpeg";
        response.data = await imgTransform.blob();
        response.success = true;
      } else {
        // failed to resize, delete data.
        console.log(`could not resize img for ${url}, deleting resp`);
        delete response.data;
        delete response.encoding;
      }
    } else {
      response.success = true;
    }
  } else {
    // Fallback, detect if this is an image
    if (url.startsWith("https://cardyb.bsky.app/v1/image")) {
      // we dump the images entirely to the image service, if it fails, then we don't care
      const originalImage = decodeURIComponent(url.replace("https://cardyb.bsky.app/v1/image?url=", ""));
      // check file extensions, this is dumb but w/e
      const dotFileExt = BSKY_IMG_FILE_EXTS.map((itm) => `.${itm}`);
      for (const ext of dotFileExt) {
        if (originalImage.includes(ext)) {
          return await fetchThumb(c, originalImage);
        }
      }
    }
  }
  return response;
}