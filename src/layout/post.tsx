import { html } from "hono/html";
import { Post } from "../classes/post";
import { MAX_POSTED_LENGTH } from "../limits";
import { PostDataFooter, PostDataHeader } from "./posts/wrappers";

type PostContentProps = {
  text: string;
  posted: boolean;
  repost: boolean;
};

export function PostContent(props: PostContentProps) {
  const ellipses = props.posted && !props.repost && props.text.length >= (MAX_POSTED_LENGTH-1) ? "..." : "";
  return (<p class="postText">{props.text}{ellipses}</p>);
};

type ScheduledPostOptions = {
  post: Post;
  // if the object should be dynamically replaced.
  // usually in edit/cancel edit settings.
  dynamic?: boolean;
};

export function PostHTML(props: ScheduledPostOptions) {
  const content: Post = props.post;
  const oobSwapStr = (props.dynamic) ? `hx-swap-oob="#post-${content.postid}"` : "";
  const hasBeenPosted: boolean = (content.posted === true && content.uri !== undefined);

  const postHTML = html`
  <article
    id="post-${content.postid}" ${oobSwapStr}>
    ${<PostDataHeader content={content} posted={hasBeenPosted} />}
    <div id="content-${content.postid}">
      ${<PostContent text={content.text} posted={content.posted || false} repost={content.isRepost || false} />}
    </div>
    ${<PostDataFooter content={content} posted={hasBeenPosted} />}
  </article>`;
  // if this is a thread, chain it nicely
  if (content.isChildPost)
    return html`<blockquote>${postHTML}</blockquote>`;

  return postHTML;
};
