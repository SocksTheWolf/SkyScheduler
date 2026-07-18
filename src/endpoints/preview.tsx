import { Hono } from "hono";
import isEmpty from "just-is-empty";
import { BSKY_IMG_MIME_TYPES, PREVENT_NON_IMAGE_PREVIEWS } from "../limits";
import { hasAuth, pullAuthData } from "../middleware/auth";
import type { HonoBase } from "../types";
import { FileContentSchema } from "../validation/mediaSchema";

export const preview = new Hono<HonoBase>();

preview.get("/file/:id", pullAuthData, async (c) => {
  if (!hasAuth(c)) {
    return c.redirect("/thumbs/missing.png");
  }

  const { id } = c.req.param();
  const validation = FileContentSchema.safeParse({content: id});
  if (!validation.success) {
    return c.redirect("/thumbs/missing.png");
  }

  const fetchedFile = await c.env.R2.get(id);
  if (fetchedFile === null) {
    return c.redirect("/thumbs/missing.png");
  }

  const customData = fetchedFile.customMetadata !== undefined;
  const contentType = fetchedFile.httpMetadata?.contentType || customData ? fetchedFile.customMetadata!["type"] : "";
  if (PREVENT_NON_IMAGE_PREVIEWS && BSKY_IMG_MIME_TYPES.includes(contentType) === false) {
    return c.redirect("/thumbs/missing.png");
  }

  const uploaderId = customData ? fetchedFile.customMetadata["user"] : "";
  if (isEmpty(uploaderId) || c.get("userId") !== uploaderId) {
    return c.redirect("/thumbs/image.png");
  }

  // @ts-ignore
  return c.body(await fetchedFile.blob(), 200, {
    "Content-Type": contentType
  })
});