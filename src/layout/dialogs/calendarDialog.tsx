import type { BaseElementProps } from "../../types";

export default function CalendarDialog(_props: BaseElementProps) {
  return (<>
  <dialog id="calendarDialog" class="modal-xlg">
    <article>
      <header><h1 class="calendarDialogHeader">Calendar View</h1> <button class="secondary closeCalendarButton right">Close</button></header>
      <div id="calendarView" class="ec-dark"></div>
      <footer>
        <button class="secondary closeCalendarButton">Close</button>
      </footer>
    </article>
  </dialog>
</>);
}