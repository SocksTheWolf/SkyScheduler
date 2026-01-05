import { Context, Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { validate as isValid  } from 'uuid';
import { Bindings, EmbedDataType, LooseObj } from "../types.d";
import { ContextVariables } from "../auth";
import { authMiddleware } from "../middleware/auth";
import { corsHelperMiddleware } from "../middleware/corsHelper";
import { FileDeleteSchema } from "../validation/mediaSchema";
import { EditSchema } from "../validation/postSchema";
import { createPostObject } from "../utils/helpers";
import { makePost } from "../utils/bskyApi";
import { deleteFromR2, uploadFileR2 } from "../utils/r2Query";
import { createPost, deletePost, getPostById, getUsernameForUser, setPostNowOffForPost, updatePostForUser } from "../utils/dbQuery";
import { ScheduledPost, ScheduledPostList } from "../layout/postList";
import { PostEdit } from "../layout/editPost";
import isEmpty from "just-is-empty";

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
    return c.html(<b class="btn-error">Post was invalid</b>, 400);
  }

  const body = await c.req.json();
  const validation = EditSchema.safeParse(body);
  if (!validation.success) {
    return c.html(<b class="btn-error">New post had invalid data</b>);
  }

  const { content, altEdits } = validation.data;
  const originalPost = await getPostById(c, id);
  // get the original data for the post so that we can just inline edit it via a push
  if (isEmpty(originalPost)) {
    return c.html(<b class="btn-error">Could not find post to edit</b>);
  }

  let hasEmbedEdits = false;
  // Create an original post object for this object
  const originalPostData = createPostObject(originalPost[0]);
  if (altEdits !== undefined && !isEmpty(altEdits)) {
    // Check to see if this post had editable data
    if (originalPostData.embeds === undefined) {
      return c.html(<b class="btn-error">Post did not have media content that was editable</b>);
    }

    // Create an easy map to match content with quickly
    let editsMap = new Map();
    altEdits.forEach((item) => {
      editsMap.set(item.content, item.alt);
    });

    // process and match up all of the alt text properly
    for (let i = 0; i < originalPostData.embeds?.length; ++i) {
      let embedData = originalPostData.embeds[i];
      // if we have anything other than an image, this is an error
      if (embedData.type !== EmbedDataType.Image) {
        return c.html(<b class="btn-error">Invalid operation performed</b>);
      }
      // Check to see if this text was edited
      const newAltText = editsMap.get(embedData.content);
      if (newAltText !== undefined) {
        // it was
        originalPostData.embeds[i].alt = newAltText;
      }
    }
    hasEmbedEdits = true;
  }
  const payload: LooseObj = { content: content };
  // push embedContent as ediable yes.
  if (hasEmbedEdits)
    payload.embedContent = originalPostData.embeds;
  
  if (await updatePostForUser(c, id, payload)) {
    originalPostData.text = content;
    const username = await getUsernameForUser(c);
    c.header("HX-Trigger-After-Swap", "timeSidebar");
    return c.html(<ScheduledPost post={originalPostData} user={username} dynamic={true} />);
  }

  return c.html(<b class="btn-error">Failed to process</b>);
});

// delete a post
post.delete("/delete/:id", authMiddleware, async (c: Context) => {
  const { id } = c.req.param();
  if (isValid(id)) {
    if (await deletePost(c, id) === true) {
      c.header("HX-Trigger-After-Swap", "postDeleted");
      return c.html(<></>);
    }
  }
  c.header("HX-Trigger-After-Swap", "postFailedDelete");
  return c.html(<></>);
});
