import { APP_NAME } from "../../appInfo";
import { ALLOW_AUTO_FOLLOW } from "../../config";

export function FollowServiceAccount() {
  if (!ALLOW_AUTO_FOLLOW)
    return null;

  return (
    <article>
      <header><label for="autoFollow">Follow the official {APP_NAME} Account</label></header>
      <input id="autoFollow" type="checkbox" name="autoFollow" />
      Check the box if you would like to automatically follow the service account.<br />
      <small>This will allow {APP_NAME} to message you when errors are detected or if you need to reset your password.</small>
      <footer>This is completely <b>OPTIONAL</b> but is recommended!</footer>
    </article>
  );
}

export function AdvancedSignupFields() {
  // Add other fields here too, eventually maybe.
  if (!ALLOW_AUTO_FOLLOW)
    return null;

  return (
    <details>
      <summary>Advanced Signup Options</summary>
      <FollowServiceAccount />
    </details>
  );
}