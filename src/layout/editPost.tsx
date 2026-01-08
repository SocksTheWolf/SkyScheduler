import { MAX_LENGTH } from "../limits.d";
import { EmbedDataType, Post } from "../types.d";
import { PostContentObject } from "./postList";

type EditedPostProps = {
  post: Post;
};

export function PostAltTextEdit({post}: EditedPostProps) {
  let num = -1;
  const embedAltTextEdit = post.embeds?.map((embedData) => {
    ++num;
    if (embedData.type !== EmbedDataType.Image)
      return;

    return (
      <div class="editAltBlock" alteditfor={embedData.content}>
        <img width="120px" height="120px" class="editImgThumb" src={`preview/file/${embedData.content}`} /><br />
        <center>
          <input type="hidden" name={`altEdits.${num}.content`} value={embedData.content} />
          <input type="hidden" data-alt={true} name={`altEdits.${num}.alt`} value={embedData.alt} />
          {/* Accessible handlers will be added in via the htmx header */}
          <a tabindex={0} role="button" data-file={embedData.content} 
            class="editPostAlt secondary outline">Edit Alt</a>
        </center>
      </div>
    );
  });

  const altEditBlock = embedAltTextEdit;
  if (altEditBlock === undefined || altEditBlock?.at(0) === undefined || altEditBlock.length <= 0) {
    return (<></>);
  }

  return (<section>
    <header><small>Embed Edits</small></header>
    <hr />
    <div class="alt-editors">
      {altEditBlock}
    </div>
    <hr />
  </section>);
}

export function PostEdit({post}:EditedPostProps) {
  // If this post is posted, just show the same object again.
  if (post.posted) {
    return (<PostContentObject text={post.text}/>);
  }

  const editSpinner:string = `editSpinner${post.postid}`;
  const editResponse:string = `editResponse${post.postid}`;
  return (
    <form id={`editPost${post.postid}`} hx-ext="form-json" hx-post={`/post/edit/${post.postid}`} hx-target={`#${editResponse}`}
        hx-swap="innerHTML swap:0.2s" hx-indicator={`#${editSpinner}`}>
      <section>
        <textarea autofocus name="content" id={`edit${post.postid}`} rows={6} tabindex={0} required>
          {post.text}
        </textarea>
        <small>Character Count: <span id={`editCount${post.postid}`}>0/{MAX_LENGTH}</span></small>
      </section>

      <PostAltTextEdit post={post} />
      <progress id={editSpinner} class="htmx-indicator" />
      <center class="controls">
        <div id={editResponse}>
        </div>
        <button tabindex={0}>Update Post</button> 
        <a tabindex={0} role="button" class="secondary cancelEditButton">Cancel</a>
      </center>
    </form>
  );
}