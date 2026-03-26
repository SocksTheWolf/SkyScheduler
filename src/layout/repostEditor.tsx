import { validate as isValid } from 'uuid';
import { Post } from "../classes/post";
import { RepostInfo } from "../classes/repost";
import { AllContext } from "../types";
import { getPostById } from "../utils/dbQuery";

type RepostEditorProps = {
  id: string;
  data?: RepostInfo[];
};

export function RepostEditorData(props: RepostEditorProps) {
  if (props.data === undefined || !isValid(props.id)) {
    return (<>No Reposts To Edit</>);
  }
  const sortedData = props.data.toSorted((a, b) => {
    if (a.time < b.time) return -1;
    if (a.time > b.time) return 1;
    return 0;
  });
  // The hx-confirm will get injected once the timestamps are localized on the client.
  return (<>{sortedData.map((obj) => {
    return (<tr class="repost-editor-item">
      <th scope="row" class="timestamp">{obj.time}</th>
      <td>{obj.hours > 0 ? `Every ${obj.hours} hours` : "once"}</td>
      <td>{obj.count}</td>
      <td><a role="button" hx-delete={`/post/${props.id}/repost/${obj.guid}`}
        hx-indicator="#repostDataPopoverProgress"
        hx-disabled-elt=".repost-editor-item a"
        hx-target="closest tr" hx-swap="delete">Delete</a></td>
    </tr>);
  })}</>);
};

type RepostDataPopoverProps = {
  ctx: AllContext;
  id: string;
};

export async function RepostDataPopover(props: RepostDataPopoverProps) {
  const repostInfoData: Post|null = await getPostById(props.ctx, props.id);
  if (repostInfoData === null) {
    return (<></>);
  }

  return (<div class="pico" id="repostDataPopoverHolder">
  <article id="repostDataPopover" popover="auto">
    <header>
      <h2>Edit Repost Rules</h2>
    </header>
    <p>Here are the current repost rules for the given post. If a rule overlaps another, the first rule wins.</p>
    <table class="striped">
      <thead>
        <tr>
          <th scope="col">Repost Start Date</th>
          <th scope="col">Repost Cadance</th>
          <th scope="col">Approx Num Reposts</th>
          <th scope="col">Action</th>
        </tr>
      </thead>
      <tbody>
        <RepostEditorData id={props.id} data={repostInfoData?.repostInfo} />
      </tbody>
    </table>
    <progress id="repostDataPopoverProgress" class="htmx-indicator" />
    <footer>
      <small id="click-close" class="clicker noselect" tabindex={0}>Click to close this editor</small>
    </footer>
  </article>
  </div>);
};
