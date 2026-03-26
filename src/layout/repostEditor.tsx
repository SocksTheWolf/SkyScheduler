import { validate as isValid } from 'uuid';
import { Post } from "../classes/post";
import { RepostInfo } from "../classes/repost";
import { AllContext } from "../types";
import { getPostById } from "../utils/dbQuery";

type RepostEditorTableProps = {
  id: string;
  data?: RepostInfo[];
};

function RepostEditorTable(props: RepostEditorTableProps) {
  if (props.data === undefined || !isValid(props.id)) {
    return (<>No Reposts To Edit</>);
  }
  const sortedData = props.data.toSorted((a, b) => {
    if (a.time < b.time) return -1;
    if (a.time > b.time) return 1;
    return 0;
  });
  return (<table class="striped">
    <thead>
      <tr>
        <th scope="col">Repost Start Date</th>
        <th scope="col">Repost Cadance</th>
        <th scope="col"><span data-tooltip="This field does not update with the number of reposts that have been made">Approx Num Reposts</span></th>
        <th scope="col">Action</th>
      </tr>
    </thead>
    <tbody>
      {sortedData.map((obj) => {
        const isMultiRetweet: boolean = obj.hours > 0;
        return (<tr class="repost-editor-item">
          <th scope="row" class="timestamp">{obj.time}</th>
          <td>{isMultiRetweet ? `Every ${obj.hours} hours` : "once"}</td>
          <td>{isMultiRetweet ? obj.count : 0} + 1 (initial)</td>
          <td><a role="button" hx-delete={`/post/${props.id}/repost/${obj.guid}`}
            hx-indicator="#repostDataPopoverProgress"
            hx-disabled-elt=".repost-editor-item a"
            hx-target="closest tr" hx-swap="delete">Delete</a></td>
        </tr>);
      })}
    </tbody>
  </table>);
}

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
    <p>Here are the current repost rules for the given post.</p>
    <p><b>NOTE</b>: If a schedule rule overlaps with another, then only the first rule has a registered action, and any duplicate scheduled action is not created.</p>
    <RepostEditorTable id={props.id} data={repostInfoData?.repostInfo} />
    <progress id="repostDataPopoverProgress" class="htmx-indicator" />
    <footer>
      <small id="click-close" class="clicker noselect" tabindex={0}>Click to close this editor</small>
    </footer>
  </article>
  </div>);
};
