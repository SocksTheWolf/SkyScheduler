import { raw } from "hono/html";
import isEmpty from "just-is-empty";
import { Post } from "../../classes/post";
import { AddPostToThreadButton, AddRepostsButton, DeletePostButton, EditPostButton } from "./buttons";
import { RepostCountElement, RepostStatusIcon } from "./repostData";

type PostDataHeaderOptions = {
  content: Post;
  posted: boolean;
};

export function PostDataHeader(props: PostDataHeaderOptions) {
  const content: Post = props.content;

  // if this post can be manipulated in some way
  const canBeEdited = !props.posted && !content.isRepost;
  const canBeDeleted = (!props.posted || (content.isRepost && content.repostCount! > 0));
  const canAddReposts = !content.isChildPost && props.posted && content.canAddMoreRepostRules();

  // show the header if any of the above cases is true
  const canSeeHeader = canBeEdited || canBeDeleted || canAddReposts;
  return (<header class="postItemHeader" data-item={content.postid} data-root={content.rootPost || content.postid}
    data-parent={content.isChildPost ? content.parentPost : undefined}
    hidden={canSeeHeader ? undefined : true}>
      <RepostStatusIcon isRepost={content.isRepost} />
      {canBeEdited ? <EditPostButton id={content.postid} /> : null}
      {canBeEdited ? <AddPostToThreadButton /> : null}
      {canAddReposts ? <AddRepostsButton /> : null}
      {canBeDeleted ? <DeletePostButton id={content.postid} isRepost={content.isRepost} child={content.isChildPost} /> : null}
  </header>);
};


type PostDataFooterOptions = {
  content: Post;
  posted: boolean;
};

export function PostDataFooter(props: PostDataFooterOptions) {
  const content: Post = props.content;
  const hasPosted: boolean = props.posted;
  return (<footer>
    <small>
      <a class="secondary" hidden={!hasPosted} tabindex={hasPosted ? undefined : -1}
        data-uri={content.uri}
        href={content.getURI() || undefined}
        target="_blank" title="link to post">{content.isRepost ? "Repost on" : "Posted on"}</a>
      <span hidden={hasPosted}>Scheduled for</span>:
      &nbsp;<span class="timestamp">{raw(content.scheduledDate!)}</span>
      {content.hasEmbeds() ? ' | Embeds: ' + content.embeds?.length : null}
      <RepostCountElement count={content.repostCount} repostInfo={content.repostInfo} />
    </small>
  </footer>);
};