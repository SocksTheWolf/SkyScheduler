import { raw } from "hono/html";
import { Post } from "../../classes/post";
import { RepostCountElement } from "./repostData";

type PostDataFooterOptions = {
  content: Post;
  posted: boolean;
};

export default function PostDataFooter(props: PostDataFooterOptions) {
  const content: Post = props.content;
  const hasPosted: boolean = props.posted;
  return (<footer><small>
    <a class="secondary" hidden={!hasPosted} tabindex={hasPosted ? undefined : -1}
      data-uri={content.uri}
      href={content.getURI() || undefined}
      target="_blank" title="link to post">{content.isRepost ? "Repost on" : "Posted on"}</a>
    <span hidden={hasPosted}>Scheduled for</span>:
    &nbsp;<span class="timestamp">{raw(content.scheduledDate!)}</span>
    {content.hasEmbeds() ? ' | Embeds: ' + content.embeds!.length : null}
    <RepostCountElement id={content.postid} count={content.repostCount} repostInfo={content.repostInfo} />
  </small></footer>);
};