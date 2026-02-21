import { raw } from "hono/html";
import isEmpty from "just-is-empty";
import { Post } from "../../types";
import { AddPostToThreadButton, DeletePostButton, EditPostButton } from "./buttons";
import { RepostCountElement, RepostIcon } from "./repostData";

type PostDataHeaderOptions = {
  content: Post;
  posted: boolean;
};

export function PostDataHeader(props: PostDataHeaderOptions) {
  const content: Post = props.content;
  const canSeeHeader = !props.posted || (content.isRepost && content.repostCount! > 0);

  return (
    <header class="postItemHeader" data-item={content.postid} data-root={content.rootPost || content.postid}
      data-parent={content.isChildPost ? content.parentPost : undefined}
      hidden={canSeeHeader ? undefined: true}>
        <RepostIcon isRepost={content.isRepost} />
        {!props.posted ? <EditPostButton id={content.postid} /> : null}
        {!props.posted ? <AddPostToThreadButton /> : null}
        {canSeeHeader ? <DeletePostButton id={content.postid} isRepost={content.isRepost} child={content.isChildPost} /> : null}
    </header>);
};


type PostDataFooterOptions = {
  content: Post;
  posted: boolean;
};

export function PostDataFooter(props: PostDataFooterOptions) {
  const content: Post = props.content;
  const postURIID: string|null = content.uri ? content.uri.replace("at://","").replace("app.bsky.feed.","") : null;
  const hasPosted: boolean = props.posted;
  return (
    <footer>
      <small>
        <a class="secondary" hidden={!hasPosted} tabindex={hasPosted ? undefined : -1}
          data-uri={content.uri}
          href={`https://bsky.app/profile/${postURIID}`}
          target="_blank" title="link to post">{content.isRepost ? "Repost on" : "Posted on"}</a>
        <span hidden={hasPosted}>Scheduled for</span>:
        &nbsp;<span class="timestamp">{raw(content.scheduledDate!)}</span>
        {!isEmpty(content.embeds) ? ' | Embeds: ' + content.embeds?.length : null}
        <RepostCountElement count={content.repostCount} repostInfo={content.repostInfo} />
      </small>
    </footer>);
};