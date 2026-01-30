import isEmpty from "just-is-empty";
import { MAX_REPOST_IN_HOURS, MAX_REPOST_INTERVAL_LIMIT } from "../limits.d";

type RetweetOptionsProps = {
  id: string;
  contentType?: string;
  checked?: boolean;
  hidden?: boolean;
  timeString?: string;
  checkboxLabel?: string;
};

export function RetweetOptions(props: RetweetOptionsProps) {
  const repostedFrom = !isEmpty(props.timeString) ? props.timeString : "the post time";
  const checkboxLabel = !isEmpty(props.checkboxLabel) ? props.checkboxLabel : "Should Auto-Retweet?";
  return (
    <section class="retweetOptions">
      <input class="autoRetweetBox" type="checkbox" id={props.id} hidden={props.hidden} startchecked={props.checked} />
      <label hidden={props.hidden} class="noselect" for={props.id}>{checkboxLabel}</label>
      <center class="retweetScheduleSimple">
          Automatically retweet this {props.contentType || "content"} every 
          <select disabled>
            {[...Array(MAX_REPOST_IN_HOURS)].map((x, i) => {
              if (i == 0) return;
              const dayStr = i % 24 === 0 ? ` (${i/24} day)` : '';
              return (<option value={i}>{i}{dayStr}</option>);
            })}
          </select> hours 
          <select disabled>
            {[...Array(MAX_REPOST_INTERVAL_LIMIT)].map((x, i) => {
              if (i == 0) return;
              return (<option value={i}>{i}</option>);
            })}
          </select> times from {repostedFrom}.
      </center>
    </section>
  );
}