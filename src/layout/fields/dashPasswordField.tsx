import { MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../../limits";
import { PWAutoCompleteSettings } from "../../types";

type DashboardPasswordFieldSettings = {
  required?: boolean
  autocomplete: PWAutoCompleteSettings
}

export default function DashboardPasswordField(props: DashboardPasswordFieldSettings) {
  let autocompleteSetting: string = "";
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
  return (<input id="password" type="password" name="password" minlength={MIN_DASHBOARD_PASS}
    maxlength={MAX_DASHBOARD_PASS} required={props.required || undefined}
    autocomplete={autocompleteSetting} />);
}