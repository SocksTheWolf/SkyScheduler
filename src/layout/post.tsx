import { html } from "hono/html";
import type { Post } from "../classes/post";
import { MAX_POSTED_LENGTH, TRUNCATE_POSTED_CONTENT } from "../limits";
import type { BaseElementProps } from "../types";
import PostDataFooter from "./posts/footer";
import PostDataHeader from "./posts/header";

type PostContentProps = {
  post: Post;
};

export function PostContent(props: PostContentProps) {
  const post: Post = props.post;
  const ellipses: string = post.isPosted && !post.isARepost && ((TRUNCATE_POSTED_CONTENT &&
    post.text.length >= (MAX_POSTED_LENGTH-1)) || post.isChildPost) ? "..." : "";

  return (<p class="postText">{post.text}{ellipses}</p>);
};

type ScheduledPostOptions = BaseElementProps & {
  post: Post;
  // if the object should be dynamically replaced.
  // usually in edit/cancel edit settings.
  dynamic?: boolean;
};

export function PostHTML(props: ScheduledPostOptions) {
  const content: Post = props.post;
  const hasBeenPosted: boolean = (content.posted === true && content.uri !== undefined);

  const postHTML = (<article id={`post-${content.postid}`}
      hx-swap-oob={(props.dynamic) ? `#post-${content.postid}` : undefined}>
    <PostDataHeader content={content} posted={hasBeenPosted} />
    <div id={`content-${content.postid}`}>
      <PostContent post={content} />
    </div>
    <PostDataFooter content={content} posted={hasBeenPosted} />
  </article>);
  // if this is a thread, chain it nicely
  if (content.isChildPost)
    return html`<blockquote>${postHTML}</blockquote>`;

  return postHTML;
};
