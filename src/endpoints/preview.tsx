import { Context, Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { Bindings } from "../types.d";
import { ContextVariables } from "../auth";
import { authMiddleware } from "../middleware/auth";
import { corsHelperMiddleware } from "../middleware/corsHelper";
import { BSKY_IMG_MIME_TYPES } from "../limits.d";
import { FileContentSchema } from "../validation/mediaSchema";
import isEmpty from "just-is-empty";

export const preview = new Hono<{ Bindings: Bindings, Variables: ContextVariables }>();

preview.use(secureHeaders());
preview.use(corsHelperMiddleware);

preview.get("/file/:id", authMiddleware, async (c: Context) => {
  const { id } = c.req.param();
  const validation = FileContentSchema.safeParse({content: id});
  if (!validation.success) {
    return c.redirect("/thumbs/image.png");
  }

  const fetchedFile = await c.env.R2.get(id);
  if (fetchedFile === null) {
    return c.redirect("/thumbs/image.png");
  }
  
  const contentType = fetchedFile.httpMetadata?.contentType || fetchedFile.customMetadata["type"];
  if (BSKY_IMG_MIME_TYPES.includes(contentType) === false) {
    return c.redirect("/thumbs/image.png");
  }

  const uploaderId = fetchedFile.customMetadata["user"];
  if (isEmpty(uploaderId) || c.get("userId") !== uploaderId) {
    return c.redirect("/thumbs/image.png");
  }
  
  return c.body(await fetchedFile.blob(), 200, {
    "Content-Type": contentType
  })
});