import { Context, Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { Bindings } from "../types";
import { ContextVariables } from "../auth";
import { authMiddleware } from "../middleware/auth";
import { corsHelperMiddleware } from "../middleware/corsHelper";
import { createPostObject } from "../utils/helpers";
import { makePost } from "../utils/bskyApi";
import { ScheduledPostList } from "../layout/postList";
import { uploadFileR2 } from "../utils/r2Query";
import { createPost, deletePost, getPostById } from "../utils/dbQuery";

export const post = new Hono<{ Bindings: Bindings, Variables: ContextVariables }>();

post.use(secureHeaders());
post.use(corsHelperMiddleware);

// Create media upload
post.post("/upload", authMiddleware, async (c: Context) => {
  const formData = await c.req.parseBody();
  const fileUploadResponse = await uploadFileR2(c.env, formData['file']);
  if (fileUploadResponse.success === false) {
    return c.json(fileUploadResponse, 400);
  }
  return c.json(fileUploadResponse, 200);
});

// Delete an upload
post.delete("/upload", authMiddleware, async (c: Context) => {
  const data = await c.req.json();

  // this can never fail
  await c.env.R2.delete(data['key']);
  return c.json({"success": true}, 200);
});

// Create post
post.post("/create", authMiddleware, async (c: Context) => {
  const body = await c.req.json();
  const response = await createPost(c, body);
  if (!response.ok) {
    return c.json({message: response.msg}, 400);
  } else if (response.postNow) {
    const postInfo = await getPostById(c.env, response.postId);
    const postResponse = await makePost(c.env, createPostObject(postInfo[0]));
    if (postResponse === false) {
      return c.json({message: "Failed to post content immediately..."}, 400);
    }
  }
  return c.json({ message: "Post scheduled successfully" });
});

// Get all posts
post.all("/all", authMiddleware, async (c: Context) => {
  c.header("HX-Trigger-After-Swap", "timeSidebar");
  return c.html(
    <ScheduledPostList ctx={c} />
  );
});

// delete a post
post.delete("/delete/:id", authMiddleware, async (c: Context) => {
  const { id } = c.req.param();
  await deletePost(c.env, id);

  c.header("HX-Trigger-After-Swap", "showDeleteMsg");
  return c.redirect("/post/all");
});
