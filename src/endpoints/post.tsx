import { Hono } from "hono";
import isEmpty from "just-is-empty";
import { validate as isValid } from 'uuid';
import type { Post } from "../classes/post";
import { PostEdit } from "../layout/editPost";
import { PostHTML } from "../layout/post";
import { ScheduledPostList } from "../layout/postList";
import { RepostDataPopover } from "../layout/repostEditor";
import { CAN_EDIT_REPOST_RULES } from "../limits";
import { authMiddleware, authMiddlewareHTML } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import type {
  CreateObjectResponse, CreatePostQueryResponse,
  DeleteResponse, HonoBase, LooseObj
} from "../types";
import {
  createPost, createRepost, deletePost, deleteRepostRule, getPostById,
  getPostByIdWithReposts, updatePostForUser
} from "../utils/dbQuery";
import { isAltEditableType } from "../utils/helpers";
import { requestDeleteFromR2, uploadFileR2 } from "../utils/r2Query";
import { handlePostNowTask } from "../utils/scheduler";
import { FileUploadSchema } from "../validation/fileUploadSchema";
import { FileDeleteSchema } from "../validation/mediaSchema";
import { EditSchema } from "../validation/postSchema";

export const post = new Hono<HonoBase>();

// Create media upload
post.post("/upload", authMiddleware, async (c) => {
  const validation = await c.req.parseBody().then((body) => FileUploadSchema.safeParse(body));
  if (!validation.success) {
    return c.json({"success": false, "error": validation.error.toString()}, 400);
  }

  const { file } = validation.data;
  const fileUploadResponse = await uploadFileR2(c, file as File, c.get("userId"));
  if (fileUploadResponse.success === false)
    return c.json(fileUploadResponse, 400);
  else
    return c.json(fileUploadResponse, 200);
});

// Delete an upload
post.delete("/upload", authMiddleware, async (c) => {
  const body = await c.req.json();

  // Validate that this is a legitimate key
  const validation = FileDeleteSchema.safeParse(body);
  if (!validation.success) {
    return c.json({"ok": false, "msg": validation.error.toString()}, 402);
  }

  const { content } = validation.data;
  const deleteRequest = await requestDeleteFromR2(c, content);
  if (deleteRequest)
    return c.json({"ok": true, "msg": "deleted file"}, 200);
  else
    return c.json({"ok": false, "msg": "unable to delete file"}, 400);
});

// Create post
post.post("/create", authMiddleware, rateLimit({limiter: "POST_LIMITER"}), async (c) => {
  const response: CreatePostQueryResponse = await c.req.json().then((body) => createPost(c, body));
  if (!response.ok) {
    return c.json({ok: false, msg: response.msg}, 400);
  } else if (response.postNow && response.postId) {
    // Handling posting right now.
    const postInfo: Post|null = await getPostById(c, response.postId);
    if (!isEmpty(postInfo)) {
      if (await handlePostNowTask(c, postInfo!) === false)
        return c.json({ok: false, msg: "Unable to post now, will try again during next nearest posting time"}, 406);
      return c.json({ok: true, msg: "Created Post!", id: response.postId});
    } else {
      return c.json({ok: false, msg: "Unable to get post content, post may have been lost"}, 401);
    }
  }
  return c.json({ ok: true, msg: "Post scheduled successfully!", id: response.postId});
});

// Create repost
post.post("/create/repost", authMiddleware, rateLimit({limiter: "REPOST_LIMITER"}), async (c) => {
  const response: CreateObjectResponse = await c.req.json().then((body) => createRepost(c, body));
  if (!response.ok) {
    return c.json({ok: false, msg: response.msg}, 400);
  }
  return c.json({ ok: true, msg: "Retweet scheduled successfully!", id: response.postId});
});

// Get all posts
post.all("/all", authMiddlewareHTML, async (c) => {
  c.header("HX-Trigger-After-Swap", "updateTimestamps, sidebarButtons");
  return c.html(<ScheduledPostList ctx={c} />);
});

// Edit posts
post.get("/edit/:id", authMiddlewareHTML, async (c) => {
  const { id } = c.req.param();
  if (!isValid(id))
    return c.html(<></>);

  const postInfo = await getPostById(c, id);
  if (postInfo !== null) {
    c.header("HX-Trigger-After-Swap", `{"editPost": "${id}"}`);
    return c.html(<PostEdit post={postInfo} />);
  }
  return c.html(<></>);
});

post.post("/edit/:id", authMiddlewareHTML, async (c) => {
  const { id } = c.req.param();
  const swapErrEvents: string = "refreshPosts, scrollTop, scrollListTop";
  if (!isValid(id)) {
    c.header("HX-Trigger-After-Swap", swapErrEvents);
    return c.html(<b class="btn-error">Post was invalid</b>);
  }

  const body = await c.req.json();
  const validation = EditSchema.safeParse(body);
  if (!validation.success) {
    return c.html(<b class="btn-error">New post had invalid data</b>);
  }

  const { content, altEdits } = validation.data;
  const originalPost = await getPostByIdWithReposts(c, id);
  // get the original data for the post so that we can just inline edit it via a push
  if (originalPost === null) {
    c.header("HX-Trigger-After-Settle", swapErrEvents);
    return c.html(<b class="btn-error">Could not find post to edit</b>);
  }

  let hasEmbedEdits = false;
  if (originalPost.posted === true) {
    c.header("HX-Trigger-After-Settle", "scrollTop");
    return c.html(<b class="btn-error">This post has already been posted</b>);
  }

  // Handle alt text and stuffs
  if (altEdits !== undefined && !isEmpty(altEdits)) {
    // Check to see if this post had editable data
    if (originalPost.embeds === undefined) {
      c.header("HX-Trigger-After-Settle", swapErrEvents);
      return c.html(<b class="btn-error">Post did not have media content that was editable</b>);
    }

    // Create an easy map to match content with quickly
    let editsMap: Map<string, string> = new Map();
    altEdits.forEach((item) => {
      editsMap.set(item.content, item.alt);
    });

    // process and match up all of the alt text properly
    for (let i = 0; i < originalPost.embeds?.length; ++i) {
      let embedData = originalPost.embeds[i];
      // if we have anything other than an image or video, skip it
      if (!isAltEditableType(embedData.type)) {
        continue;
      }
      // Check to see if this text was edited
      const newAltText = editsMap.get(embedData.content);
      if (newAltText !== undefined) {
        // it was
        originalPost.embeds[i].alt = newAltText;
        hasEmbedEdits = true;
      }
    }
  }
  const payload: LooseObj = { content: content };
  // push edited embedContent.
  if (hasEmbedEdits)
    payload.embedContent = originalPost.embeds;

  if (await updatePostForUser(c, id, payload)) {
    originalPost.text = content;
    c.header("HX-Trigger-After-Settle", `{"scrollListToPost": "${id}"}`);
    c.header("HX-Trigger-After-Swap", "postUpdatedNotice, updateTimestamps, sidebarButtons, scrollTop");
    return c.html(<PostHTML post={originalPost} dynamic={true} />);
  }

  c.header("HX-Trigger-After-Settle", swapErrEvents);
  return c.html(<b class="btn-error">Failed to process edit</b>);
});

post.get("/edit/:id/cancel", authMiddlewareHTML, async (c) => {
  const { id } = c.req.param();
  if (!isValid(id))
    return c.html(<></>);

  const postInfo = await getPostByIdWithReposts(c, id);
  // Get the original post to replace with
  if (postInfo !== null) {
    c.header("HX-Trigger-After-Swap", "updateTimestamps, sidebarButtons, scrollListTop, scrollTop");
    return c.html(<PostHTML post={postInfo} dynamic={true} />);
  }

  // Refresh sidebar otherwise
  c.header("HX-Trigger-After-Swap", "refreshPosts, updateTimestamps, sidebarButtons, scrollListTop, scrollTop");
  return c.html(<b class="btn-error">Internal error occurred, reloading...</b>);
});

// delete a post
post.delete("/delete/:id", authMiddlewareHTML, async (c) => {
  const { id } = c.req.param();
  if (isValid(id)) {
    const response: DeleteResponse = await deletePost(c, id);
    if (response.success === true) {
      let postRefreshEvent = "";
      // This is true if this was the root of a thread chain
      if (response.needsRefresh) {
        postRefreshEvent = ", refreshPosts, updateTimestamps, scrollTop";
      }
      const triggerEvents = `resetIfThreading, accountViolations${postRefreshEvent}`;
      c.header("HX-Trigger-After-Swap", triggerEvents);
      c.header("HX-Trigger-After-Settle", `{"postDeleted": ${response.isRepost}}`);
      return c.html(<></>);
    }
  }
  c.header("HX-Trigger-After-Swap", "postFailedDelete");
  return c.html(<></>);
});

// get the repost rule editor
post.get("/:id/repost", authMiddlewareHTML, rateLimit({limiter: "REPOST_EDITOR_OPEN_LIMITER", toast: true}), async (c) => {
  if (CAN_EDIT_REPOST_RULES) {
    const { id } = c.req.param();
    if (isValid(id)) {
      c.header("HX-Trigger-After-Swap", "updateTimestamps, showRepostPopover");
      return c.html(<RepostDataPopover ctx={c} id={id} />);
    }
  }
  return c.html(<></>);
});

// delete a post's repost rule
post.delete("/:id/repost/:scheduleId", authMiddlewareHTML, rateLimit({limiter: "REPOST_EDIT_LIMITER", html: true, toast: true}), async (c) => {
  if (CAN_EDIT_REPOST_RULES) {
    const { id, scheduleId } = c.req.param();
    if (isValid(id) && isValid(scheduleId)) {
      if (await deleteRepostRule(c, id, scheduleId)) {
        c.header("HX-Trigger-After-Swap", "repostScheduleDeleted");
        return c.html(<></>);
      }
    }
  }
  return c.html(<>Invalid</>);
});