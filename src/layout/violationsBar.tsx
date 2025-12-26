import { Context } from "hono";
import { getViolationsForCurrentUser } from "../utils/dbQuery";
import { Violation } from "../types.d";

export async function ViolationNoticeBar(props: any) {
  const ctx:Context = props.ctx;
  const {success, results} = await getViolationsForCurrentUser(ctx);
  if (success && results.length > 0) {
    let errorStr = "";
    const violationData:Violation = (results[0] as Violation)
    if (violationData.tosViolation) {
      errorStr = "Your account is in violation of SkyScheduler usage.";
    } else if(violationData.userPassInvalid) {
      errorStr = "Your Bluesky handle or application password is invalid. Please update these in the settings.";
    } else if (violationData.accountSuspended) {
      errorStr = "Your account has been suspended by Bluesky. Some features may not work at this time";
    } else if (violationData.accountGone) {
      errorStr = "Unable to find your account, update your Bluesky handle in the settings";
    }
    return (
      <div id="violationBar" class="warning-box">
        <span class="warning"><b>WARNING</b>: Account error found! {errorStr}</span>
      </div>
    );
  }
  return (
    <></>
  );
};