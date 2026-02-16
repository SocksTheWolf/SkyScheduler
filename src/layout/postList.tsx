import { Context } from "hono";
import { html, raw } from "hono/html";
import isEmpty from "just-is-empty";
import { Post } from "../types.d";
import { getUsernameForUser } from "../utils/db/userinfo";
import { getPostsForUser } from "../utils/dbQuery";

type PostContentObjectProps = {
  text: string;
};

export function PostContentObject({text}: PostContentObjectProps) {
  return (<p class="postText">{text}</p>);
}

type ScheduledPostOptions = {
  post: Post;
  user: string|null;
  // if the object should be dynamically replaced.
  // usually in edit/cancel edit settings.
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
  const deleteReplace = `hx-target="${content.isChildPost ? 'blockquote:has(' : ''}#postBase${content.postid}${content.isChildPost ? ')' :''}"`;
  const editAttributes = hasBeenPosted ? '' : raw(`title="Click to edit post content" hx-get="/post/edit/${content.postid}"
        hx-trigger="click once" hx-target="#post${content.postid}" hx-swap="innerHTML show:#editPost${content.postid}:top"`);
  const deletePostElement = raw(`<button type="submit" hx-delete="/post/delete/${content.postid}"
        hx-confirm="Are you sure you want to delete this ${postType}?" title="Click to delete this ${postType}"
        data-placement="left" data-tooltip="Delete this ${postType}" ${raw(deleteReplace)}
        hx-swap="outerHTML" hx-trigger="click" class="btn-sm btn-error outline btn-delete">
          <img src="/icons/trash.svg" alt="trash icon" width="20px" height="20px" />
      </button>`);
  const editPostElement = raw(`<button class="editPostKeyboard btn-sm primary outline"
        data-tooltip="Edit this post" data-placement="right" ${editAttributes}>
        <img src="/icons/edit.svg" alt="edit icon" width="20px" height="20px" />
      </button>`);
  const threadItemElement = raw(`<button class="addThreadPost btn-sm primary outline" data-tooltip="Add a post to thread"
      data-placement="right" listen="false">
        <img src="/icons/reply.svg" alt="threaded post icon" width="20px" height="20px" />
      </button>`);

  let repostInfoStr:string = "";
  if (!isEmpty(content.repostInfo)) {
    for (const repostItem of content.repostInfo!) {
      if (repostItem.count >= 1) {
        const repostWrapper = `<span class="timestamp">${repostItem.time}</span>`;
        if (repostItem.count == 1 && repostItem.hours == 0)
          repostInfoStr += `* Repost at ${repostWrapper}`;
        else
          repostInfoStr += `* Every ${repostItem.hours} hours, ${repostItem.count} times from ${repostWrapper}`;
        repostInfoStr += "\n";
      }
    }
  }
  const repostCountElement = content.repostCount ?
    (<> | <span class="repostTimesLeft" tabindex={0} data-placement="left">
      <span class="repostInfoData" hidden={true}>{raw(repostInfoStr)}</span>Reposts Left: {content.repostCount}</span></>) : "";

  // This is only really good for debugging, this attribute isn't used anywhere else.
  const parentMetaAttr = (content.isChildPost) ? `data-parent="${content.parentPost}"` : "";
  const canSeeHeader = !hasBeenPosted || (content.isRepost && content.repostCount! > 0);

  const postHTML = html`
  <article
    id="postBase${content.postid}" ${oobSwapStr}>
    <header class="postItemHeader" data-item="${content.postid}" data-root="${content.rootPost || content.postid}" ${raw(parentMetaAttr)}
      ${canSeeHeader ? raw('>') : raw(`hidden>`)}
        ${!hasBeenPosted ? editPostElement : null}
        ${!hasBeenPosted ? threadItemElement : null}
        ${canSeeHeader ? deletePostElement : null}
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
          ${repostCountElement}
      </small>
    </footer>
  </article>`;
  // if this is a thread, chain it nicely
  if (content.isChildPost)
    return html`<blockquote>${postHTML}</blockquote>`;

  return postHTML;
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
