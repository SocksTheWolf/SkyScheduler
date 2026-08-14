import { html } from "hono/html";
import isEmpty from "just-is-empty";
import { TRUNCATE_POSTED_CONTENT } from "../config";
import type { Post } from "../classes/post";
import { MAX_POSTED_LENGTH } from "../limits";
import type { BaseElementProps } from "../types";
import PostDataFooter from "./posts/footer";
import PostDataHeader from "./posts/header";

interface PostContentProps {
  post: Post;
}

export function PostContent(props: PostContentProps) {
  const post: Post = props.post;
  const ellipses: string = post.isPosted && !post.isARepost && ((TRUNCATE_POSTED_CONTENT &&
    post.content.length >= (MAX_POSTED_LENGTH-1)) || post.isChildPost) ? "..." : "";

  return (<p class="postText">{post.content}{ellipses}</p>);
};

type ScheduledPostOptions = BaseElementProps & {
  post: Post;
  // if the object should be dynamically replaced.
  // usually in edit/cancel edit settings.
  dynamic?: boolean;
};

export function PostHTML(props: ScheduledPostOptions) {
  const content: Post = props.post;
  const hasBeenPosted: boolean = (content.posted === true && !isEmpty(content.uri));

  const postHTML = (<article id={`post-${content.uuid}`}
      hx-swap-oob={(props.dynamic) ? `#post-${content.uuid}` : undefined}>
    <PostDataHeader content={content} posted={hasBeenPosted} />
    <div id={`content-${content.uuid}`}>
      <PostContent post={content} />
    </div>
    <PostDataFooter content={content} posted={hasBeenPosted} />
  </article>);
  // if this is a thread, chain it nicely
  if (content.isChildPost)
    return html`<blockquote>${postHTML}</blockquote>`;

  return postHTML;
};
