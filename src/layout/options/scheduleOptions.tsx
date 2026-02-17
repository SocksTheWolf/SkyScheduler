import isEmpty from "just-is-empty";

type ScheduleOptionsProps = {
  timeID: string;
  checkboxID?: string;
  type: string;
  allowNow: boolean;
  header?: string;
};

export function ScheduleOptions(props: ScheduleOptionsProps) {
  const hasHeader = !isEmpty(props.header);
  const headerText = hasHeader ? props.header : "";

  const postNowHTML = (props.allowNow) ?
  (<div>
    <input class="postNow" type="checkbox" id={props.checkboxID} />
    <label class="noselect capitialize checkboxLine" for={props.checkboxID}>Make {props.type} Now?</label>
  </div>) : null;

  return (
    <section class="scheduledDateBlock">
      <article>
        <header hidden={!hasHeader}>{headerText}</header>
        <input class="timeSelector" type="datetime-local" id={props.timeID} placeholder="" required />
        <small>Time is based on your device's current timezone and is automatically converted for you.</small>
        {postNowHTML}
        <footer>
          <small>
            <i>You can schedule {props.type}s in the future, hourly. Time is rounded down to the nearest hour.</i>
          </small>
        </footer>
      </article>
    </section>
  );
}