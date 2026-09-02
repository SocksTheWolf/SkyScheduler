import { FUNDING_KEY, PROGRESS_TOTAL } from "../../appInfo";
import type { AllContext, BaseElementProps } from "../../types";

export async function ProgressBar(props: BaseElementProps) {
  const ctx: AllContext = props.ctx!;
  const totalAmount: string = await ctx.env.FUNDING?.get(FUNDING_KEY) ?? "0.00";
  const progressBarTooltip = `$${totalAmount}/$${PROGRESS_TOTAL} for this month`;
  return (<>
    <span data-tooltip={progressBarTooltip}>Current Server Fund Progress:</span>
    <progress value={totalAmount} max={PROGRESS_TOTAL} /><br />
    <a href="/tip" target="_blank" class="secondary" title="Tip on Kofi">Tip here</a>
    <hr />
  </>);
}