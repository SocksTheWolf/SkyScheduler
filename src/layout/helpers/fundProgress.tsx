import { PROGRESS_TOTAL, SERVICE_DOMAIN } from "../../appInfo";
import type { AllContext, BaseElementProps } from "../../types";
import { TipLink } from "./tipLink";

export function LoadFundingProgress() {
  return (<div class="serverFunds" hx-get="/funding" hx-trigger="load once" hx-target="this" hx-swap="innerHTML"></div>);
}

export async function FundingProgress(props: BaseElementProps) {
  const ctx: AllContext = props.ctx!;
  const curProgress: string = await ctx.env.FUNDING?.get(SERVICE_DOMAIN) ?? "0.00";
  const totalAmount: string = PROGRESS_TOTAL.toFixed(2);
  const progressBarTooltip = `$${curProgress}/$${totalAmount} for this month`;
  return (<div class="fundsBox">
    <span data-tooltip={progressBarTooltip}>Server Bills Progress:</span>
    <div role="group">
      <span>$0</span>
      <progress class="fundsProgress" value={curProgress} max={totalAmount} />
      <span>${PROGRESS_TOTAL}</span>
    </div><br />
    <TipLink text="Tip Here" />
    <hr />
  </div>);
}