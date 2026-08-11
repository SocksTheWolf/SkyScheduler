import { raw } from "hono/html";
import { APP_NAME } from "../appInfo";
import type { AllContext, BaseElementProps } from "../types";
import { getViolationsForCurrentUser } from "../utils/db/violations";

type ViolationNoticeBarProps = BaseElementProps & {
  // skip the db query and instead fetch that later
  forceLoad?: boolean;
};

function HiddenEmptyViolationsBar(props?: ViolationNoticeBarProps) {
  let triggerStr = "accountViolations from:body";
  if (props?.forceLoad)
    triggerStr += ", load once";

  return (<div hx-trigger={triggerStr} hidden id="hiddenViolations"
    hx-get="/account/violations" hx-swap="outerHTML" hx-target="this"></div>);
}

// HTML Renders of buttons for resolving violations
const resolveConflictsButton = (<span>
  Once this issue is resolved on Bluesky, press this button to restore access:&nbsp;
  <a role="button" class="secondary" hx-post="/account/violations/resolve" hx-swap="delete" hx-disabled-elt="this">
  Resolve Conflicts
  </a>
</span>);
const updateSettingsButton = (<a role="button" class="secondary" id="violationSettingsLink">Update Settings</a>);

export async function ViolationNoticeBar(props: ViolationNoticeBarProps) {
  if (props.ctx === undefined)
    return (<></>);

  if (props.forceLoad) {
    return (<HiddenEmptyViolationsBar forceLoad={true} />);
  }

  const ctx: AllContext = props.ctx;
  const violationData = await getViolationsForCurrentUser(ctx);
  if (violationData !== null) {
    let errorStr = "";
    let renderButton = null;
    if (violationData.tosViolation) {
      errorStr = `Your account is in violation of ${APP_NAME} usage. You are blocked from using services at this time.`;
    } else if(violationData.userPassInvalid) {
      renderButton = updateSettingsButton;
      errorStr = `Your Bluesky handle or application password is invalid.`;
    } else if (violationData.accountGone) {
      errorStr = `Your Bluesky account is currently deactivated. Features will not work until reactivation.`;
      renderButton = resolveConflictsButton;
    } else if (violationData.accountSuspended) {
      errorStr = `Your account has been suspended by Bluesky. Some features may not work at this time.`;
      renderButton = resolveConflictsButton;
    } else if (violationData.takenDown) {
      errorStr = `Your account has been taken down by Bluesky.`;
      renderButton = resolveConflictsButton;
    } else if (violationData.mediaTooBig) {
      errorStr = "You currently have media that's too large for Bluesky (like a video), please delete those posts";
    }
    return (
      <div id="violationBar" class="warning-box" hx-trigger="accountViolations from:body"
        hx-swap="outerHTML" hx-get="/account/violations" hx-target="this">
        <span class="warning"><b>WARNING</b>: Account error found! {raw(errorStr)}{renderButton ?? undefined}</span>
      </div>
    );
  }
  // Empty violations so that we can refresh if new ones appear
  return (<HiddenEmptyViolationsBar />);
};