import { Context } from "hono";
import { html, raw } from "hono/html";
import { getPostsForUser, getUsernameForUser } from "../utils/dbQuery";
import { Post } from "../types.d";
import isEmpty from "just-is-empty";

type PostContentObjectProps = {
  text: string;
};

export function PostContentObject({text}: PostContentObjectProps) {
  return (<p class="truncate">{text}</p>);
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
  const postURIID: string|null = content.uri ? content.uri.replace("at://","").replace("app.bsky.feed.","") : null;

  const postType = content.isRepost ? "repost" : "post";
  const postOnText = content.isRepost ? "Repost on" : "Posted on";
  const editAttributes = hasBeenPosted ? '' : raw(`title="Click to edit post content" hx-get="/post/edit/${content.postid}" 
        hx-trigger="click once" hx-target="#post${content.postid}" hx-swap="innerHTML show:#editPost${content.postid}:top"`);
  const deletePostElement = raw(`<button type="submit" hx-delete="/post/delete/${content.postid}" 
        hx-confirm="Are you sure you want to delete this ${postType}?" title="Click to delete this ${postType}" 
        data-placement="left" data-tooltip="Delete this ${postType}" hx-target="#postBase${content.postid}" 
        hx-swap="outerHTML" hx-trigger="click" class="btn-sm btn-error outline btn-delete">
        <img src="/icons/trash.svg" alt="trash icon" width="20px" height="20px" />
      </button>`);
  const editPostElement = raw(`<button class="editPostKeyboard btn-sm primary outline" listening="false" 
        data-tooltip="Edit this post" data-placement="right" ${editAttributes}>
        <img src="/icons/edit.svg" alt="edit icon" width="20px" height="20px" />
      </button>`);

  return html`
  <article id="postBase${content.postid}" ${oobSwapStr}>
    <header class="postItemHeader" ${hasBeenPosted && !content.isRepost ? raw('hidden>') : raw(`>`)}
      ${!hasBeenPosted ? editPostElement : null}
      ${!hasBeenPosted || content.isRepost ? deletePostElement : null}
    </header>
    <div id="post${content.postid}">
      ${<PostContentObject text={content.text}/>}
    </div>
    <footer>
      <small>
        ${hasBeenPosted ? 
          raw(`<a class="secondary" data-uri="${content.uri}" href="https://bsky.app/profile/${postURIID}" 
            target="_blank" title="link to post">${postOnText}</a>:`) : 
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
    if (!isEmpty(response)) {
      return (
        <>
        <a hidden tabindex={-1} class="invalidateTab hidden"></a>
        {response!.map((data: Post) => {
          return <ScheduledPost post={data} user={username} />;
        })}
        </>
      );
    }
  }

  return (
    <article>
      <a hidden tabindex={-1} class="invalidateTab hidden"></a>
      <p>No posts scheduled</p>
    </article>
  );
};
