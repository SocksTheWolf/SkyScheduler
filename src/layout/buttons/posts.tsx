// Buttons for post header tags
export function AddPostToThreadButton() {
  return (<button class="addThreadPost btn-sm primary outline" listen="false"
    title="Add a post underneath this one">
    <span data-tooltip="Add a post to thread" data-placement="right">
      <img src="/icons/reply.svg" alt="threaded post icon" width="20px" height="20px" />
    </span>
  </button>);
}

export function AddRepostsButton() {
  return (<button class="addRepostsButton btn-sm primary outline" listen="false"
    title="Add additional reposts to this post">
    <span data-placement="right" data-tooltip="Add reposts">
      <img src="/icons/add-repost.svg" alt="add reposts icon" width="20px" height="20px" />
    </span>
  </button>);
}

type PostIDProps = {
  id: string;
}

export function EditPostButton({id}: PostIDProps) {
  return (<button class="editPostKeyboard btn-sm primary outline"
    hx-trigger="click once"
    title="Click to edit post content"
    hx-get={`/post/edit/${id}`}
    hx-target={`#content-${id}`}
    hx-swap={`innerHTML show:#editPost-${id}:top"`}>
      <span data-tooltip="Edit this post" data-placement="right">
        <img src="/icons/edit.svg" alt="edit icon" width="20px" height="20px" />
      </span>
  </button>);
}

type DeletePostProps = PostIDProps & {
  child: boolean;
  isRepost?: boolean;
}

export function DeletePostButton(props: DeletePostProps) {
  const deleteTargetId = `#post-${props.id}`;
  const postType = props.isRepost ? "repost" : "post";
  const deleteTarget = props.child ? `blockquote:has(${deleteTargetId})` : deleteTargetId;
  return (<button type="submit" hx-delete={`/post/delete/${props.id}`}
    hx-confirm={`Are you sure you want to delete this ${postType}?`}
    title={`Click to delete this ${postType}`} hx-target={deleteTarget}
    hx-swap="outerHTML" hx-trigger="click" class="btn-sm btn-error outline deletePostsButton">
      <span data-placement="left" data-tooltip={`Delete this ${postType}`}>
        <img src="/icons/trash.svg" alt="trash icon" width="20px" height="20px" />
      </span>
  </button>);
};
