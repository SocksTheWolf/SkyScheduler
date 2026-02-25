import { raw } from "hono/html";
import isEmpty from "just-is-empty";
import { RepostInfo } from "../../classes/repost";

type RepostStatusIconProps = {
  isRepost?: boolean;
};

export function RepostStatusIcon(props: RepostStatusIconProps) {
  if (props.isRepost === true) {
    return (
      <span class="repostStatus">
        <img src="/icons/is-repost.svg" class="repostIcon" alt="reposted post icon" width="20px" height="20px" />
        <small>&nbsp;Reposted Post</small>
      </span>
    );
  }
  return null;
};

type RepostCountProps = {
  count?: number;
  repostInfo?: RepostInfo[];
};

export function RepostCountElement(props: RepostCountProps) {
  if (props.count === undefined || props.count <= 0) {
    return null;
  }
  let repostInfoStr: string = "";
  if (!isEmpty(props.repostInfo)) {
    for (const repostItem of props.repostInfo!) {
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
  return (
    <> | <span class="repostTimesLeft" tabindex={0} data-placement="left">
      <span class="repostInfoData" hidden={true}>{raw(repostInfoStr)}</span>
      Reposts Left: {props.count}</span>
    </>
  );
};