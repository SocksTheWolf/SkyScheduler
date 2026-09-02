import isEmpty from "just-is-empty";
import type { TimeIntervalSettings } from "../../enums";
import type { BaseElementProps } from "../../types";
import { explainTimeInterval } from "../../utils/helpers";

type ScheduleOptionsProps = BaseElementProps & {
  timeID: string;
  checkboxID?: string;
  type: string;
  allowNow: boolean;
  header?: string;
  timeInterval: TimeIntervalSettings;
  isRepost?: boolean;
};

export default function ScheduleOptions(props: ScheduleOptionsProps) {
  const hasHeader = !isEmpty(props.header);
  const headerText = hasHeader ? props.header : "";
  const postingScheduleStr: string = explainTimeInterval(props.timeInterval, true);

  const postNowHTML = (props.allowNow) ?
  (<div>
    <input class="postNow" type="checkbox" id={props.checkboxID} />
    <label class="noselect capitialize checkboxLine" for={props.checkboxID}>Make {props.type} Now?</label>
  </div>) : null;

  return (<section class="scheduledDateBlock" isRepost={props.isRepost}>
    <article>
      <header hidden={!hasHeader}>{headerText}</header>
      <input class="timeSelector" type="datetime-local" id={props.timeID} placeholder="" required />
      <small>Time is based on your device's current timezone (<small><code class="timeZoneName"></code></small>) 
        and is automatically converted for you.</small>
      {postNowHTML}
      <footer>
        <small>
          <i>You can schedule {props.type}s in the future, at every {postingScheduleStr}. Time is rounded down to the nearest {postingScheduleStr}.</i>
        </small>
      </footer>
    </article>
  </section>);
};