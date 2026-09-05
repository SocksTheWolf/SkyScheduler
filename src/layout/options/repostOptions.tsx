import isEmpty from "just-is-empty";
import { REPOSTING_TIME_INTERVAL } from "../../config";
import { TimeIntervalSettings } from "../../enums";
import { MAX_REPOST_IN_HOURS, MAX_REPOST_INTERVAL_LIMIT } from "../../limits";
import type { BaseElementProps } from "../../types";
import { formatTime } from "../../utils/time";

interface RepostOptionsProps extends BaseElementProps {
  id: string;
  contentType?: string;
  checked?: boolean;
  hidden?: boolean;
  timeString?: string;
  checkboxLabel?: string;
};

export default function RepostOptions(props: RepostOptionsProps) {
  const repostedFrom = !isEmpty(props.timeString) ? props.timeString : "the post time";
  const checkboxLabel = !isEmpty(props.checkboxLabel) ? props.checkboxLabel : "Should Auto-Retweet?";
  return (<section>
    <input class="autoRepostBox" type="checkbox" id={props.id} hidden={props.hidden} startchecked={props.checked} />
    <label hidden={props.hidden} class="noselect checkboxLine" for={props.id}>{checkboxLabel}</label>
    <fieldset class="repostScheduleSimple" role="group">
      <span class="noselect">Automatically repost this {props.contentType ?? "content"} every</span>
      <RepostTimeSelector />
      <RepostAmountSelector />
      <span class="noselect">from {repostedFrom}.</span>
    </fieldset>
  </section>);
}

function RepostTimeSelector() {
  const subIntervalLimit: number = 60 / REPOSTING_TIME_INTERVAL;
  return (<select disabled>
    {[...Array(MAX_REPOST_IN_HOURS)].map((_x, i) => {
      if (i == 0 && REPOSTING_TIME_INTERVAL == TimeIntervalSettings.Hour) return;
      const dayField = Math.floor(i/24);
      const hourField = i % 24;
      // This array is pure evil and ugly and horrible
      const evilArray = [];
      // do not let a 0 element be added (only true if REPOSTING_TIME_INTERVAL is not Hour)
      for (let t = (i == 0) ? 1 : 0; t < subIntervalLimit; ++t) {
        const minutesValue: number = t * (REPOSTING_TIME_INTERVAL);
        evilArray.push(<option value={i + minutesValue/60}>{formatTime(dayField, hourField, minutesValue)}</option>);
        // When at limit, we should not add sub options, so break out.
        if (i == MAX_REPOST_IN_HOURS-1)
          break;
      }
      return evilArray;
    })}
  </select>);
};

function RepostAmountSelector() {
  return (<select disabled>
    {[...Array(MAX_REPOST_INTERVAL_LIMIT)].map((_x, i) => {
      if (i == 0) return;
      return (<option value={i}>{i} times</option>);
    })}
  </select>);
}