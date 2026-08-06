import type { BaseElementProps } from "../../types";

export default function SettingsButton(_props?: BaseElementProps) {
  return (<button class="outline contrast" id="settingsButton">
    <span>Account Settings</span>
    <img src="/icons/settings.svg" height="20px" width="20px" alt="settings gear" />
  </button>);
}
