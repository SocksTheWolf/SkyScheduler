import type { BaseElementProps } from "../../types";

export default function CalendarButton(_props?: BaseElementProps) {
  return (<button class="outline contrast" id="openCalendarButton">
    <img src="/icons/calendar.svg" height="20px" width="20px" alt="calendar icon" />
    <span>Open Calendar View</span>
  </button>);
}