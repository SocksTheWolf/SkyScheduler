type ScheduleOptionsProps = {
  timeID: string;
  checkboxID: string;
};

export function ScheduleOptions(props: ScheduleOptionsProps) {
  return (
    <section class="scheduledDateBlock">
      <article>
        <input class="timeSelector" type="datetime-local" id={props.timeID} placeholder="" required />
        <small>Time is based on your device's current timezone and is automatically converted for you.</small>
        <input class="postNow" type="checkbox" id={props.checkboxID} /> <label class="noselect" for={props.checkboxID}>Make Post Now?</label>
        <footer>
          <small>
            <i>You can schedule posts in the future, hourly. Time is rounded down to the nearest hour.</i>
          </small>
        </footer>
      </article>
    </section>
  );
}