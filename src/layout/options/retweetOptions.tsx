import { formatDuration, FormatDurationOptions } from "date-fns";
import isEmpty from "just-is-empty";
import { MAX_REPOST_IN_HOURS, MAX_REPOST_INTERVAL_LIMIT, REPOSTING_TIME_INTERVAL } from "../../limits";
import type { BaseElementProps } from "../../types";

type RetweetOptionsProps = BaseElementProps & {
  id: string;
  contentType?: string;
  checked?: boolean;
  hidden?: boolean;
  timeString?: string;
  checkboxLabel?: string;
};

export default function RetweetOptions(props: RetweetOptionsProps) {
  const repostedFrom = !isEmpty(props.timeString) ? props.timeString : "the post time";
  const checkboxLabel = !isEmpty(props.checkboxLabel) ? props.checkboxLabel : "Should Auto-Retweet?";
  const formatDateOptions: FormatDurationOptions = {zero: false, format: ["days", "hours", "minutes"]};
  const subIntervalLimit: number = 60 / REPOSTING_TIME_INTERVAL;
  return (<section>
    <input class="autoRepostBox" type="checkbox" id={props.id} hidden={props.hidden} startchecked={props.checked} />
    <label hidden={props.hidden} class="noselect checkboxLine" for={props.id}>{checkboxLabel}</label>
    <fieldset class="repostScheduleSimple" role="group">
      <span class="noselect">Automatically repost this {props.contentType || "content"} every</span>
      <select disabled>
        {[...Array(MAX_REPOST_IN_HOURS)].map((x, i) => {
          if (i == 0) return;
          const dayField = Math.floor(i/24);
          const hourField = i % 24;
          // This array is pure evil and ugly and horrible
          let evilArray = [];
          for (let t = 0; t < subIntervalLimit; ++t) {
            evilArray.push(<option value={i + (t * (REPOSTING_TIME_INTERVAL as number))/60}>{formatDuration({days: dayField, hours: hourField, minutes: t * (REPOSTING_TIME_INTERVAL as number)}, formatDateOptions)}</option>);
            // When at limit, we should not add sub options, so break out.
            if (i == MAX_REPOST_IN_HOURS-1)
              break;
          }
          return evilArray;
        })}
      </select>
      <select disabled>
        {[...Array(MAX_REPOST_INTERVAL_LIMIT)].map((x, i) => {
          if (i == 0) return;
          return (<option value={i}>{i} times</option>);
        })}
      </select>
      <span class="noselect">from {repostedFrom}.</span>
    </fieldset>
  </section>);
}