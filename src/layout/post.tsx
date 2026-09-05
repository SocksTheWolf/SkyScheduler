import isEmpty from "just-is-empty";
import type { Post } from "../classes/post";
import { TRUNCATE_POSTED_CONTENT } from "../config";
import { PostOOBSwapOption } from "../enums";
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

interface ScheduledPostOptions extends BaseElementProps, PostContentProps {
  oobSwap?: PostOOBSwapOption;
};

interface InternalPostOptions {
  oob?: string;
}

export function PostHTML(props: ScheduledPostOptions) {
  const content: Post = props.post;
  const hasBeenPosted: boolean = (content.posted === true && !isEmpty(content.uri));
  let oobSwapValue: string|undefined;
  switch (props.oobSwap) {
    case PostOOBSwapOption.InsertAfterParent:
      if (content.parentPost == content.rootPost)
        oobSwapValue = `afterend:#post-${content.parentPost}`;
      else
        oobSwapValue = `afterend:blockquote:has(#post-${content.parentPost})`;
    break;
    case PostOOBSwapOption.Full:
      if (content.isChildPost)
        oobSwapValue = `outerHTML:blockquote:has(#post-${content.uuid})`;
      else
        oobSwapValue = `outerHTML:#post-${content.uuid}`;
    break;
    default:
      oobSwapValue = undefined;
    break;
  }

  const InternalPostHTML = (iprops: InternalPostOptions) => (<article id={`post-${content.uuid}`} hx-swap-oob={iprops.oob}>
    <PostDataHeader content={content} posted={hasBeenPosted} />
    <div id={`content-${content.uuid}`}>
      <PostContent post={content} />
    </div>
    <PostDataFooter content={content} posted={hasBeenPosted} />
  </article>);
  // if this is a thread, chain it nicely
  if (content.isChildPost)
    return (<blockquote hx-swap-oob={oobSwapValue}><InternalPostHTML /></blockquote>);

  return (<><InternalPostHTML oob={oobSwapValue} /></>);
};
