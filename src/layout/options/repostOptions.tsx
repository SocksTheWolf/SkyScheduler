import isEmpty from "just-is-empty";
import type { BaseElementProps } from "../../types";
import { RepostAmountSelector, RepostTimeSelector } from "../fields/scheduleSelectorField";

type RepostOptionsProps = BaseElementProps & {
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
      <span class="noselect">Automatically repost this {props.contentType || "content"} every</span>
      <RepostTimeSelector />
      <RepostAmountSelector />
      <span class="noselect">from {repostedFrom}.</span>
    </fieldset>
  </section>);
}