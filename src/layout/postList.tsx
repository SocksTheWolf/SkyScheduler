import isEmpty from "just-is-empty";
import type { Post } from "../classes/post";
import type { AllContext, BaseElementProps } from "../types";
import { getPostsForUser } from "../utils/dbQuery";
import { PostHTML } from "./post";

const HiddenAnchor = () => (<a hidden tabindex={-1} class="invalidateTab hidden"></a>);

export const ScheduledPostList = async (props: BaseElementProps) => {
  const ctx: AllContext|undefined = props.ctx;
  if (ctx !== undefined) {
    const response: Post[]|null = await getPostsForUser(ctx);
    if (!isEmpty(response)) {
      return (<>
        <HiddenAnchor />
        {response!.map((data: Post) => {
          return <PostHTML post={data} />;
        })}
      </>);
    }
  }

  return (<article>
    <HiddenAnchor />
    <p>No posts scheduled</p>
  </article>);
};
