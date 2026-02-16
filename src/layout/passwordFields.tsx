import { html } from "hono/html";
import { BSKY_MAX_APP_PASSWORD_LENGTH, MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits";
import { PWAutoCompleteSettings } from "../types.d";
import { appPasswordRegex } from "../validation/regexCases";

type PasswordFieldSettings = {
  required?: boolean
}

type DashboardPasswordFieldSettings = {
  required?: boolean
  autocomplete: PWAutoCompleteSettings
}

export function BSkyAppPasswordField(props: PasswordFieldSettings) {
  const requiredAttr:string = props.required ? "required" : "";
  return html`<input type="password" name="bskyAppPassword" title="Bluesky account's App Password"
            maxlength=${BSKY_MAX_APP_PASSWORD_LENGTH} placeholder="" ${requiredAttr}
            data-1p-ignore data-bwignore data-lpignore="true"
            data-protonpass-ignore="true"
            autocomplete="off"></input>`;
}

export function DashboardPasswordField(props: DashboardPasswordFieldSettings) {
  const requiredAttr:string = props.required ? "required" : "";
  let autocompleteSetting:string = "";
  switch (props.autocomplete) {
    default:
    case PWAutoCompleteSettings.Off:
      autocompleteSetting = "off";
    break;
    case PWAutoCompleteSettings.CurrentPass:
      autocompleteSetting = "current-password";
    break;
    case PWAutoCompleteSettings.NewPass:
      autocompleteSetting = "new-password";
    break;
  }
  return html`<input id="password" type="password" name="password" minlength=${MIN_DASHBOARD_PASS}
    maxlength=${MAX_DASHBOARD_PASS} ${requiredAttr} autocomplete=${autocompleteSetting} />`;
}