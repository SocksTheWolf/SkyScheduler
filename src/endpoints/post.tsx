import { Context, Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import isEmpty from "just-is-empty";
import { validate as isValid } from 'uuid';
import { ContextVariables } from "../auth";
import { PostEdit } from "../layout/editPost";
import { PostHTML } from "../layout/post";
import { ScheduledPostList } from "../layout/postList";
import { authMiddleware } from "../middleware/auth";
import { corsHelperMiddleware } from "../middleware/corsHelper";
import {
  Bindings, CreateObjectResponse, CreatePostQueryResponse,
  DeleteResponse,
  EmbedDataType, LooseObj, Post
} from "../types.d";
import {
  createPost, createRepost,
  deletePost, getPostById,
  getPostByIdWithReposts,
  updatePostForUser
} from "../utils/dbQuery";
import { deleteFromR2, uploadFileR2 } from "../utils/r2Query";
import { handlePostNowTask } from "../utils/scheduler";
import { FileDeleteSchema } from "../validation/mediaSchema";
import { EditSchema } from "../validation/postSchema";

export const post = new Hono<{ Bindings: Bindings, Variables: ContextVariables }>();

post.use(secureHeaders());
post.use(corsHelperMiddleware);

// Create media upload
post.post("/upload", authMiddleware, async (c: Context) => {
  const formData = await c.req.parseBody();
  const fileUploadResponse = await uploadFileR2(c, formData['file'], c.get("userId"));
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
  c.executionCtx.waitUntil(deleteFromR2(c, content, false));
  return c.json({"success": true}, 200);
});

// Create post
post.post("/create", authMiddleware, async (c: Context) => {
  const body = await c.req.json();
  const response: CreatePostQueryResponse = await createPost(c, body);
  if (!response.ok) {
    return c.json({ok: false, msg: response.msg}, 400);
  } else if (response.postNow && response.postId) {
    // Handling posting right now.
    const postInfo: Post|null = await getPostById(c, response.postId);
    if (!isEmpty(postInfo)) {
      if (await handlePostNowTask(c, postInfo!) === false)
        return c.json({ok: false, msg: "Unable to post now, will try again during next nearest hour"}, 406);
      return c.json({ok: true, msg: "Created Post!", id: response.postId});
    } else {
      return c.json({ok: false, msg: "Unable to get post content, post may have been lost"}, 401);
    }
  }
  return c.json({ ok: true, msg: "Post scheduled successfully!", id: response.postId});
});

// Create repost
post.post("/create/repost", authMiddleware, async (c: Context) => {
  const body = await c.req.json();
  const response: CreateObjectResponse = await createRepost(c, body);
  if (!response.ok) {
    return c.json({ok: false, msg: response.msg}, 400);
  }
  return c.json({ ok: true, msg: "Repost scheduled successfully!", id: response.postId});
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
  if (postInfo !== null) {
    c.header("HX-Trigger-After-Swap", `{"editPost": "${id}"}`);
    return c.html(<PostEdit post={postInfo} />);
  }
  return c.html(<></>, 400);
});

post.post("/edit/:id", authMiddleware, async (c: Context) => {
  const { id } = c.req.param();
  const swapErrEvents: string = "refreshPosts, scrollTop, scrollListTop";
  if (!isValid(id)) {
    c.header("HX-Trigger-After-Swap", swapErrEvents);
    return c.html(<b class="btn-error">Post was invalid</b>, 400);
  }

  const body = await c.req.json();
  const validation = EditSchema.safeParse(body);
  if (!validation.success) {
    return c.html(<b class="btn-error">New post had invalid data</b>, 400);
  }

  const { content, altEdits } = validation.data;
  const originalPost = await getPostByIdWithReposts(c, id);
  // get the original data for the post so that we can just inline edit it via a push
  if (originalPost === null) {
    c.header("HX-Trigger-After-Settle", swapErrEvents);
    return c.html(<b class="btn-error">Could not find post to edit</b>, 400);
  }

  let hasEmbedEdits = false;
  if (originalPost.posted === true) {
    c.header("HX-Trigger-After-Settle", "scrollTop");
    return c.html(<b class="btn-error">This post has already been posted</b>, 400);
  }

  // Handle alt text and stuffs
  if (altEdits !== undefined && !isEmpty(altEdits)) {
    // Check to see if this post had editable data
    if (originalPost.embeds === undefined) {
      c.header("HX-Trigger-After-Settle", swapErrEvents);
      return c.html(<b class="btn-error">Post did not have media content that was editable</b>, 400);
    }

    // Create an easy map to match content with quickly
    let editsMap = new Map();
    altEdits.forEach((item) => {
      editsMap.set(item.content, item.alt);
    });

    // process and match up all of the alt text properly
    for (let i = 0; i < originalPost.embeds?.length; ++i) {
      let embedData = originalPost.embeds[i];
      // if we have anything other than an image, this is an error
      if (embedData.type !== EmbedDataType.Image) {
        c.header("HX-Trigger-After-Settle", swapErrEvents);
        return c.html(<b class="btn-error">Invalid operation performed</b>, 400);
      }
      // Check to see if this text was edited
      const newAltText = editsMap.get(embedData.content);
      if (newAltText !== undefined) {
        // it was
        originalPost.embeds[i].alt = newAltText;
      }
    }
    hasEmbedEdits = true;
  }
  const payload: LooseObj = { content: content };
  // push embedContent as editable yes.
  if (hasEmbedEdits)
    payload.embedContent = originalPost.embeds;

  if (await updatePostForUser(c, id, payload)) {
    originalPost.text = content;
    c.header("HX-Trigger-After-Settle", `{"scrollListToPost": "${id}"}`);
    c.header("HX-Trigger-After-Swap", "postUpdatedNotice, timeSidebar, scrollTop");
    return c.html(<PostHTML post={originalPost} dynamic={true} />);
  }

  c.header("HX-Trigger-After-Settle", swapErrEvents);
  return c.html(<b class="btn-error">Failed to process edit</b>, 400);
});

post.get("/edit/:id/cancel", authMiddleware, async (c: Context) => {
  const { id } = c.req.param();
  if (!isValid(id))
    return c.html(<></>, 400);

  const postInfo = await getPostByIdWithReposts(c, id);
  // Get the original post to replace with
  if (postInfo !== null) {
    c.header("HX-Trigger-After-Swap", "timeSidebar, scrollListTop, scrollTop");
    return c.html(<PostHTML post={postInfo} dynamic={true} />);
  }

  // Refresh sidebar otherwise
  c.header("HX-Trigger-After-Swap", "refreshPosts, timeSidebar, scrollListTop, scrollTop");
  return c.html(<b class="btn-error">Internal error occurred, reloading...</b>, 400);
});

// delete a post
post.delete("/delete/:id", authMiddleware, async (c: Context) => {
  const { id } = c.req.param();
  if (isValid(id)) {
    const response: DeleteResponse = await deletePost(c, id);
    if (response.success === true) {
      let postRefreshEvent = "";
      if (response.needsRefresh) {
        postRefreshEvent = ", refreshPosts, timeSidebar, scrollTop";
      }
      const triggerEvents = `resetIfThreading, postDeleted, accountViolations${postRefreshEvent}`;
      c.header("HX-Trigger-After-Swap", triggerEvents);
      return c.html(<></>);
    }
  }
  c.header("HX-Trigger-After-Swap", "postFailedDelete");
  return c.html(<></>, 400);
});
