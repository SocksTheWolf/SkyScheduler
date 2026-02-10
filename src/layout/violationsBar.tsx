import { Context } from "hono";
import isEmpty from "just-is-empty";
import { Violation } from "../types.d";
import { getViolationsForCurrentUser } from "../utils/db/violations";

export async function ViolationNoticeBar(props: any) {
  const ctx: Context = props.ctx;
  const {success, results} = await getViolationsForCurrentUser(ctx);
  if (success && !isEmpty(results)) {
    let errorStr = "";
    const violationData: Violation = (results[0] as Violation)
    if (violationData.tosViolation) {
      errorStr = "Your account is in violation of SkyScheduler usage.";
    } else if(violationData.userPassInvalid) {
      errorStr = "Your Bluesky handle or application password is invalid. Please update these in the settings.";
    } else if (violationData.accountSuspended) {
      errorStr = "Your account has been suspended by Bluesky. Some features may not work at this time";
    } else if (violationData.accountGone) {
      errorStr = "Unable to find your BSky account, update your Bluesky handle and app password in the settings";
    } else if (violationData.mediaTooBig) {
      errorStr = "You currently have media that's too large for Bluesky (like a video), please delete those posts";
    }
    return (
      <div id="violationBar" class="warning-box" hx-trigger="accountViolations from:body" 
        hx-swap="outerHTML" hx-get="/account/violations" hx-target="this">
        <span class="warning"><b>WARNING</b>: Account error found! {errorStr}</span>
      </div>
    );
  }
  return (<div hx-trigger="accountViolations from:body" hidden id="hiddenViolations" 
    hx-get="/account/violations" hx-swap="outerHTML" hx-target="this"></div>);
};