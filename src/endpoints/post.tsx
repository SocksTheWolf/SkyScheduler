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
import { createPost, deletePost, getPostById, updatePostForUser } from "../utils/dbQuery";
import { FileDeleteSchema } from "../validation/mediaSchema";
import PostEdit from "../layout/editPost";
import { validate as isValid  } from 'uuid';
import { EditSchema } from "../validation/postSchema";

export const post = new Hono<{ Bindings: Bindings, Variables: ContextVariables }>();

post.use(secureHeaders());
post.use(corsHelperMiddleware);

// Create media upload
post.post("/upload", authMiddleware, async (c: Context) => {
  const formData = await c.req.parseBody();
  const fileUploadResponse = await uploadFileR2(c.env, formData['file']);
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
    return c.json({"success": false, msg: validation.error.message}, 402);
  }

  const { key } = validation.data;
  // delete item from r2
  await c.env.R2.delete(key);
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
      
      const postResponse = await makePost(c.env, createPostObject(postInfo[0]));
      if (postResponse === false)
        return c.json({message: "Failed to post content immediately, will post next schedule parse"}, 400);

    } else {
      return c.json({message: "Unable to get content to post"}, 401);
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
    return c.html(<b>Failed to process</b>);
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
