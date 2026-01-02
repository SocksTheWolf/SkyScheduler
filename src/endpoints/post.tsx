import { Context, Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { validate as isValid  } from 'uuid';
import { Bindings } from "../types";
import { ContextVariables } from "../auth";
import { authMiddleware } from "../middleware/auth";
import { corsHelperMiddleware } from "../middleware/corsHelper";
import { FileDeleteSchema } from "../validation/mediaSchema";
import { EditSchema } from "../validation/postSchema";
import { createPostObject } from "../utils/helpers";
import { makePost } from "../utils/bskyApi";
import { deleteFromR2, uploadFileR2 } from "../utils/r2Query";
import { createPost, deletePost, getPostById, setPostNowOffForPost, updatePostForUser } from "../utils/dbQuery";
import { ScheduledPostList } from "../layout/postList";
import PostEdit from "../layout/editPost";

export const post = new Hono<{ Bindings: Bindings, Variables: ContextVariables }>();

post.use(secureHeaders());
post.use(corsHelperMiddleware);

// Create media upload
post.post("/upload", authMiddleware, async (c: Context) => {
  const formData = await c.req.parseBody();
  const fileUploadResponse = await uploadFileR2(c.env, formData['file'], c.get("userId"));
  if (fileUploadResponse.success === false)
    return c.json(fileUploadResponse, 400);
  else
    return c.json(fileUploadResponse, 200);
});

// Delete an upload
post.delete("/upload", authMiddleware, async (c: Context) => {
  const body = await c.req.json();

  // Validate that this is a legitimate key
  const validation = FileDeleteSchema.safeParse(body);
  if (!validation.success) {
    return c.json({"success": false, "error": validation.error}, 402);
  }

  const { content } = validation.data;
  // delete item from r2
  deleteFromR2(c, content);
  return c.json({"success": true}, 200);
});

// Create post
post.post("/create", authMiddleware, async (c: Context) => {
  const body = await c.req.json();
  const response = await createPost(c, body);
  if (!response.ok) {
    return c.json({message: response.msg}, 400);
  } else if (response.postNow) {
    const postInfo = await getPostById(c, response.postId);
    if (postInfo.length > 0) {
      const postResponse: boolean = await makePost(c, createPostObject(postInfo[0]));
      if (postResponse === false) {
        c.executionCtx.waitUntil(setPostNowOffForPost(c.env, response.postId));
        return c.json({message: "Failed to post content now, will try again soon"}, 302);
      }
      return c.json({message: "Created Post!" });
    } else {
      return c.json({message: "Unable to get post content, post may have been lost"}, 401);
    }
  }
  return c.json({ message: "Post scheduled successfully!" });
});

// Get all posts
post.all("/all", authMiddleware, async (c: Context) => {
  c.header("HX-Trigger-After-Swap", "timeSidebar");
  return c.html(
    <ScheduledPostList ctx={c} />
  );
});

// Edit posts
post.get("/edit/:id", authMiddleware, async (c: Context) => {
  const { id } = c.req.param();
  if (!isValid(id))
    return c.html(<></>, 400);

  const postInfo = await getPostById(c, id);
  if (postInfo.length > 0) {
    const postData = createPostObject(postInfo[0]);
    return c.html(
      <PostEdit post={postData} />
    );
  }
  return c.html(<></>, 400);
});

post.post("/edit/:id", authMiddleware, async (c: Context) => {
  const { id } = c.req.param();
  if (!isValid(id)) {
    c.header("HX-Trigger-After-Swap", "refreshPosts");
    return c.html(<></>, 400);
  }

  const body = await c.req.parseBody();
  const validation = EditSchema.safeParse(body);
  if (!validation.success) {
    return c.html(<b>Data was invalid</b>);
  }

  const { content } = validation.data;
  const payload = {content: content};
  if (await updatePostForUser(c, id, payload)) {
    c.header("HX-Trigger-After-Swap", "refreshPosts");
    return c.html(<b>Success</b>);
  } else {
    return c.html(<b class="btn-error">Failed to process</b>);
  }
});

// delete a post
post.delete("/delete/:id", authMiddleware, async (c: Context) => {
  const { id } = c.req.param();
  if (isValid(id)) {
    if (await deletePost(c, id) === true)
      c.header("HX-Trigger-After-Swap", "showDeleteMsg");
  }

  return c.redirect("/post/all");
});
