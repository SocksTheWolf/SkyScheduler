import { MAX_REPOST_IN_HOURS, MAX_REPOST_INTERVAL_LIMIT } from "../limits.d";

type RetweetOptionsProps = {
  id: string,
  checked?: boolean;
  hidden?: boolean;
};

export function RetweetOptions(props: RetweetOptionsProps) {
  return (
    <section class="retweetOptions">
      <input class="autoRetweetBox" type="checkbox" id={props.id} hidden={props.hidden} startchecked={props.checked} />
      <label hidden={props.hidden} class="noselect" for={props.id}>Should Auto-Retweet?</label>
      <center class="retweetScheduleSimple">
          Automatically retweet this content every 
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
          </select> times from the post time.
      </center>
    </section>
  );
}