import { Context } from "hono";
import isEmpty from "just-is-empty";
import { Post } from "../classes/post";
import { getPostsForUser } from "../utils/dbQuery";
import { PostHTML } from "./post";

type ScheduledPostListProps = {
  ctx?: Context;
};

export const ScheduledPostList = async ({ctx}: ScheduledPostListProps) => {
  if (ctx !== undefined) {
    const response: Post[]|null = await getPostsForUser(ctx);
    if (!isEmpty(response)) {
      return (<>
        <a hidden tabindex={-1} class="invalidateTab hidden"></a>
        {response!.map((data: Post) => {
          return <PostHTML post={data} />;
        })}
      </>);
    }
  }

  return (<article>
    <a hidden tabindex={-1} class="invalidateTab hidden"></a>
    <p>No posts scheduled</p>
  </article>);
};
