import { html } from "hono/html";
import { MAX_LENGTH } from "../limits.d"
import { Post } from "../types";
import { PostContentObject } from "./postList";

type EditedPostProps = {
  post: Post;
};

export default function PostEdit({post}:EditedPostProps) {
  // If this post is posted, just show the same object again.
  if (post.posted) {
    return (<PostContentObject text={post.text}/>);
  }

  const editSpinner:string = `editSpinner${post.postid}`;
  const editResponse:string = `editResponse${post.postid}`;
  return (
    <form id={`editPost${post.postid}`} hx-post={`/post/edit/${post.postid}`} hx-target={`#${editResponse}`}
        hx-swap="innerHTML" hx-indicator={`#${editSpinner}`}>
      <section>
        <textarea name="content" id={`edit${post.postid}`} rows={8} style="resize: none" required>
          {post.text}
        </textarea>
        <small>Character Count: <span id={`editCount${post.postid}`}>0/{MAX_LENGTH}</span></small>
      </section>

      <progress id={editSpinner} class="htmx-indicator" />
      <center class="controls">
        <div id={editResponse}>
        </div>
        <button>Update Post</button> 
        <a role="button" onclick={html`detachTribute(document.getElementById('edit${post.postid}'));refreshPosts();`} class="secondary">Cancel</a>
      </center>
      <script type="text/javascript">{html`
        addCounter("edit${post.postid}", "editCount${post.postid}", ${MAX_LENGTH});
        tributeToElement(document.getElementById("edit${post.postid}"));
      `}</script>
    </form>
  );
}