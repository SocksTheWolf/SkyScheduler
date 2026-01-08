import { Context } from "hono";
import { html, raw } from "hono/html";
import { getPostsForUser, getUsernameForUser } from "../utils/dbQuery";
import { Post } from "../types.d";
import isEmpty from "just-is-empty";

type PostContentObjectProps = {
  text: string;
};

export function PostContentObject({text}: PostContentObjectProps) {
  return html`
    <p class="truncate">${text}</p>
  `;
}

type ScheduledPostOptions = {
  post: Post;
  user: string|null;
  // if the object should be dynamically replaced.
  dynamic?: boolean;
}

export function ScheduledPost(props: ScheduledPostOptions) {
  const content: Post = props.post;
  const username: string|null = props.user;
  const oobSwapStr = (props.dynamic) ? `hx-swap-oob="#postBase${content.postid}"` : "";
  const hasBeenPosted: boolean = (username !== null && content.posted === true && content.uri !== undefined);
  const postURIID: string|null = content.uri ? content.uri.match(/\/((?=[^.]*$).+)/)![0] : null;

  const editAttributes = hasBeenPosted ? '' : raw(`title="Click to edit post content" hx-get="/post/edit/${content.postid}" 
        hx-trigger="click once" hx-target="#post${content.postid}" hx-swap="innerHTML show:#editPost${content.postid}:top"`);
  return html`
  <article id="postBase${content.postid}" ${oobSwapStr}>
    <header ${hasBeenPosted ? 'hidden>' : raw(`>
      <button tabindex="0" class="editPostKeyboard btn-sm primary outline" listening="false" data-tooltip="Edit this post" data-placement="right" ${editAttributes}>
        <img src="/icons/edit.svg" width="20px" height="20px" />
      </button>
      <button type="submit" hx-delete="/post/delete/${content.postid}" 
        hx-confirm="Are you sure you want to delete this post?" data-placement="left" data-tooltip="Delete this post" hx-target="#postBase${content.postid}" 
        hx-swap="outerHTML" hx-trigger="click" class="btn-sm btn-error outline btn-delete">
        <img src="/icons/trash.svg" width="20px" height="20px" />
      </button>`)}
    </header>
    <div id="post${content.postid}">
      <div ${editAttributes}>
        ${<PostContentObject text={content.text}/>}
      </div>
    </div>
    <footer>
      <small>
        ${hasBeenPosted ? 
          raw(`<a class="secondary" data-uri="${content.uri}" href="https://bsky.app/profile/${username}/post${postURIID}" 
            target="_blank" title="link to post">Posted on</a>:`) : 
          'Scheduled for:' } 
          <span class="timestamp">${content.scheduledDate}</span>
          ${!isEmpty(content.embeds) ? ' | Embeds: ' + content.embeds?.length : ''} 
          ${content.repostCount! ? ' | Reposts Left: ' + content.repostCount : ''}
      </small>
    </footer>
  </article>`;
};

type ScheduledPostListProps = {
  ctx?: Context;
};

export const ScheduledPostList = async ({ctx}: ScheduledPostListProps) => {
  if (ctx !== undefined) {
    const response: Post[]|null = await getPostsForUser(ctx);
    const username = await getUsernameForUser(ctx);
    if (response !== null) {
      if (!isEmpty(response)) {
        return (
          <>
          <a hidden tabindex={-1} class="invalidateTab hidden"></a>
          {response.map((data: Post) => {
            return <ScheduledPost post={data} user={username} />;
          })}
          </>
        );
      }
    }
  }

  return (
    <article>
      <a hidden tabindex={-1} class="invalidateTab hidden"></a>
      <p>No posts scheduled</p>
    </article>
  );
};
