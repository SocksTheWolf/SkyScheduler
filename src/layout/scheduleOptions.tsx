import isEmpty from "just-is-empty";

type ScheduleOptionsProps = {
  timeID: string;
  checkboxID: string;
  type: string;
  header?: string;
};

export function ScheduleOptions(props: ScheduleOptionsProps) {
  const hasHeader = !isEmpty(props.header);
  const headerText = hasHeader ? props.header : "";
  return (
    <section class="scheduledDateBlock">
      <article>
        <header hidden={!hasHeader}>{headerText}</header>
        <input class="timeSelector" type="datetime-local" id={props.timeID} placeholder="" required />
        <small>Time is based on your device's current timezone and is automatically converted for you.</small>
        <input class="postNow" type="checkbox" id={props.checkboxID} /> <label class="noselect capitialize" for={props.checkboxID}>Make {props.type} Now?</label>
        <footer>
          <small>
            <i>You can schedule {props.type}s in the future, hourly. Time is rounded down to the nearest hour.</i>
          </small>
        </footer>
      </article>
    </section>
  );
}