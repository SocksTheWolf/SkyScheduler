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
    <form hx-post={`/post/edit/${post.postid}`} hx-target={`#${editResponse}`}
        hx-swap="innerHTML" hx-indicator={`#${editSpinner}`}>
      <section>
        <textarea name="content" id={`content${post.postid}`} rows={8} style="resize: none" required>
          {post.text}
        </textarea>
        <small>Character Count: <div id={`editCount${post.postid}`}>0/{MAX_LENGTH}</div></small>
      </section>

      <progress id={editSpinner} class="htmx-indicator" />
      <center class="controls">
        <div id={editResponse}>
        </div>
        <button>Update Post</button> 
        <a role="button" onclick={html`tributeToElement(document.getElementById('content${post.postid}'),false);refreshPosts();`} class="secondary">Cancel</a>
      </center>
      <script type="text/javascript">{html`
        addCounter("content${post.postid}", "editCount${post.postid}");
        tributeToElement(document.getElementById("content${post.postid}"));
      `}</script>
    </form>
  );
}