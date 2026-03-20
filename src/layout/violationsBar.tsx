import { Context } from "hono";
import { raw } from "hono/html";
import { APP_NAME } from "../siteinfo";
import { getViolationsForCurrentUser } from "../utils/db/violations";

type ViolationNoticeProps = {
  ctx: Context;
}

export async function ViolationNoticeBar(props: ViolationNoticeProps) {
  const ctx: Context = props.ctx;
  const violationData = await getViolationsForCurrentUser(ctx);
  if (violationData !== null) {
    let errorStr = "";
    const resolveConflictsButton = (<span>
      Once this issue is resolved on Bluesky, press this button to restore access:&nbsp;
      <a role="button" class="secondary" hx-post="/account/violations/resolve" hx-swap="delete" hx-disabled-elt="this">
      Resolve Conflicts
      </a>
    </span>);
    if (violationData.tosViolation) {
      errorStr = `Your account is in violation of ${APP_NAME} usage. You are blocked from using services at this time.`;
    } else if(violationData.userPassInvalid) {
      const updateSettingsButton = (<a role="button" class="secondary" id="violationSettingsLink">Update Settings</a>);
      errorStr = `Your Bluesky handle or application password is invalid. ${updateSettingsButton}`;
    } else if (violationData.accountGone) {
      errorStr = `Your Bluesky account is currently deactivated. Features will not work until reactivation. ${resolveConflictsButton}`;
    } else if (violationData.accountSuspended) {
      errorStr = `Your account has been suspended by Bluesky. Some features may not work at this time. ${resolveConflictsButton}`;
    } else if (violationData.takenDown) {
      errorStr = `Your account has been taken down by Bluesky. ${resolveConflictsButton}`;
    } else if (violationData.mediaTooBig) {
      errorStr = "You currently have media that's too large for Bluesky (like a video), please delete those posts";
    }
    return (
      <div id="violationBar" class="warning-box" hx-trigger="accountViolations from:body"
        hx-swap="outerHTML" hx-get="/account/violations" hx-target="this">
        <span class="warning"><b>WARNING</b>: Account error found! {raw(errorStr)}</span>
      </div>
    );
  }
  return (<div hx-trigger="accountViolations from:body" hidden id="hiddenViolations"
    hx-get="/account/violations" hx-swap="outerHTML" hx-target="this"></div>);
};