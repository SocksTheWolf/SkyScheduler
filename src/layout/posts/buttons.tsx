
export function AddPostToThreadButton() {
  return (
    <button class="addThreadPost btn-sm primary outline" data-tooltip="Add a post to thread"
      data-placement="right" listen="false">
        <img src="/icons/reply.svg" alt="threaded post icon" width="20px" height="20px" />
    </button>
  );
}

type PostIDProps = {
  id: string;
}

export function EditPostButton({id}: PostIDProps) {
  return (
    <button class="editPostKeyboard btn-sm primary outline"
      data-tooltip="Edit this post" data-placement="right"
      hx-trigger="click once"
      title="Click to edit post content"
      hx-get={`/post/edit/${id}`}
      hx-target={`#post${id}`}
      hx-swap={`innerHTML show:#editPost${id}:top"`}>
        <img src="/icons/edit.svg" alt="edit icon" width="20px" height="20px" />
    </button>
  );
}

type DeletePostProps = PostIDProps & {
  child: boolean;
  isRepost?: boolean;
}

export function DeletePostButton(props: DeletePostProps) {
  const deleteTargetId = `#postBase${props.id}`;
  const postType = props.isRepost ? "repost" : "post";
  const deleteTarget = props.child ? `blockquote:has(${deleteTargetId})` : deleteTargetId;
  return (
    <button type="submit" hx-delete={`/post/delete/${props.id}`}
        hx-confirm={`Are you sure you want to delete this ${postType}?`}
        title={`Click to delete this ${postType}`}
        data-placement="left" data-tooltip={`Delete this ${postType}`} hx-target={deleteTarget}
        hx-swap="outerHTML" hx-trigger="click" class="btn-sm btn-error outline btn-delete">
          <img src="/icons/trash.svg" alt="trash icon" width="20px" height="20px" />
    </button>
  );
};