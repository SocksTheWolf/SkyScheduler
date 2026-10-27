import { Hono } from "hono";
import isEmpty from "just-is-empty";
import { PREVENT_NON_IMAGE_PREVIEWS } from "../config";
import { BSKY_IMG_MIME_TYPES } from "../limits";
import { hasAuth, pullAuthData } from "../middleware/auth";
import { sessionMiddleware } from "../middleware/session";
import type { HonoBase } from "../types";
import { FileContentSchema } from "../validation/mediaSchema";

export const preview = new Hono<HonoBase>();
preview.use(sessionMiddleware);

preview.get("/file/:id", pullAuthData, async (c) => {
  if (!hasAuth(c)) {
    return c.redirect("/thumbs/missing.png", 303);
  }

  const { id } = c.req.param();
  const validation = FileContentSchema.safeParse({ content: id });
  if (!validation.success) {
    return c.redirect("/thumbs/missing.png", 301);
  }

  try {
    const fetchedFile = await c.env.R2.get(id);
    if (fetchedFile === null) {
      return c.redirect("/thumbs/missing.png", 301);
    }

    const customData = fetchedFile.customMetadata !== undefined;
    const contentType = fetchedFile.httpMetadata?.contentType || customData ? fetchedFile.customMetadata!.type : "";
    if (PREVENT_NON_IMAGE_PREVIEWS && !BSKY_IMG_MIME_TYPES.includes(contentType)) {
      return c.redirect("/thumbs/missing.png", 307);
    }

    const uploaderId = customData ? fetchedFile.customMetadata.user : "";
    if (isEmpty(uploaderId) || c.get("userId") !== uploaderId) {
      return c.redirect("/thumbs/image.png", 303);
    }

    // @ts-ignore
    return c.body(await fetchedFile.blob(), 200, { "Content-Type": contentType });
  } catch (err: unknown) {
    console.error(`Failed to fetch preview of: ${id} with error ${String(err)}`);
    return c.redirect("/thumbs/network.png", 303);
  }
});
