import { Context } from "hono";
import { html, raw } from "hono/html";
import { getPostsForUser, getUsernameForUser } from "../utils/dbQuery";
import { createPostObject } from "../utils/helpers";
import { Post } from "../types.d";

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

  return html`
  <article id="postBase${content.postid}" ${oobSwapStr}>
    <div id="post${content.postid}">
      ${hasBeenPosted ? '' : raw(`<button type="submit" hx-delete="/post/delete/${content.postid}" hx-confirm="Are you sure you want to delete this post?" hx-target="#postBase${content.postid}" hx-swap="outerHTML" hx-trigger="click" class="btn-sm btn-error outline btn-delete">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20px" height="20px">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      </button>`)}
      <div ${hasBeenPosted ? '' : raw(`title="Click to edit post content" hx-get="/post/edit/${content.postid}" hx-trigger="click once" hx-target="#post${content.postid}" hx-swap="innerHTML show:#editPost${content.postid}:top"`)}>
        ${<PostContentObject text={content.text}/>}
      </div>
    </div>
    <footer>
      <small>
        ${hasBeenPosted ? 
          raw(`<a class="secondary" data-uri="${content.uri}" href="https://bsky.app/profile/${username}/post${postURIID}" target="_blank" title="link to post">Posted on</a>:`) : 
          'Scheduled for:' } 
          <span class="timestamp">${content.scheduledDate}</span>${content.repostCount! ? ' | Reposts Left: ' + content.repostCount : ''}
      </small>
    </footer>
  </article>`;
};

type ScheduledPostListProps = {
  ctx?: Context;
};

export const ScheduledPostList = async ({ctx}: ScheduledPostListProps) => {
  if (ctx !== undefined) {
    const response: Object[]|null = await getPostsForUser(ctx);
    const username = await getUsernameForUser(ctx);
    if (response !== null) {
      if (response.length > 0) {
        return (
          <>
          {response.map((message:any) => {
            const data: Post = createPostObject(message);
            return <ScheduledPost post={data} user={username} />;
          })}
          </>
        );
      }
    }
  }

  return (
    <article>
      <p>No posts scheduled</p>
    </article>
  );
};
