import { raw } from "hono/html";
import isEmpty from "just-is-empty";
import { RepostInfo } from "../../classes/repost";
import { CAN_EDIT_REPOST_RULES } from "../../limits";

type RepostStatusIconProps = {
  isRepost?: boolean;
};

export function RepostStatusIcon(props: RepostStatusIconProps) {
  if (props.isRepost === true) {
    return (
      <span class="repostStatus noselect">
        <img src="/icons/repost.svg" class="repostIcon" alt="reposted post icon" width="20px" height="20px" />
        <small>&nbsp;Reposted Post</small>
      </span>
    );
  }
  return null;
};

type RepostCountProps = {
  id: string;
  count?: number;
  repostInfo?: RepostInfo[];
};

export function RepostCountElement(props: RepostCountProps) {
  if (props.count === undefined || props.count <= 0) {
    return null;
  }
  let repostInfoStr: string = "";
  if (!isEmpty(props.repostInfo)) {
    // Sort the repost info list
    const sortedData = props.repostInfo!.toSorted((a, b) => {
      if (a.time < b.time) return -1;
      if (a.time > b.time) return 1;
      return 0;
    });
    // and then traverse it for rendering
    for (const repostItem of sortedData) {
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
  return (<> | <span class="repostTimesLeft" tabindex={0} data-placement="left">
    <span class="repostInfoData" hidden={true}>{raw(repostInfoStr)}</span>
    Reposts Left: {props.count}</span>
    {CAN_EDIT_REPOST_RULES ? <RepostEditorLink id={props.id} /> : undefined }
  </>);
};

function RepostEditorLink({id}: any) {
  return (<small>
    <span>
      <a class="clicker modify-repost"
      title="Modify repost rules"
      hx-disabled-elt=".modify-repost"
      hx-get={`/post/${id}/repost`}
      hx-target="body" hx-swap="beforeend">(Modify Reposts...)</a>
    </span>
  </small>);
};