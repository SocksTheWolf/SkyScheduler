import { Post } from "../../classes/post";
import { AddPostToThreadButton, AddRepostsButton, DeletePostButton, EditPostButton } from "../buttons/posts";
import { RepostStatusIcon } from "./repostData";

type PostDataHeaderOptions = {
  content: Post;
  posted: boolean;
};

export default function PostDataHeader(props: PostDataHeaderOptions) {
  const content: Post = props.content;

  // if this post can be manipulated in some way
  const canBeEdited = !props.posted && !content.isRepost;
  const canBeDeleted = (!props.posted || content.isRepost);
  const canAddReposts = content.canAddMoreRepostRules();

  // show the header if any of the above cases is true
  const canSeeHeader = canBeEdited || canBeDeleted || canAddReposts;
  return (<header class="postItemHeader" data-item={content.postid} data-root={content.rootPost || content.postid}
    data-parent={content.isChildPost ? content.parentPost : undefined}
    data-repost={content.isRepost || undefined}
    hidden={canSeeHeader ? undefined : true}>
    <RepostStatusIcon isRepost={content.isRepost} />
    {canBeEdited ? <EditPostButton id={content.postid} /> : null}
    {canBeEdited ? <AddPostToThreadButton /> : null}
    {canAddReposts ? <AddRepostsButton /> : null}
    {canBeDeleted ? <DeletePostButton id={content.postid} isRepost={content.isRepost} child={content.isChildPost} /> : null}
  </header>);
}
