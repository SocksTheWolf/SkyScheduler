import { MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits";
import { APP_NAME } from "../siteinfo";
import { PWAutoCompleteSettings } from "../types/site";
import { settingsScriptStr } from "../utils/appScripts";
import { BSkyAppPasswordField, DashboardPasswordField } from "./passwordFields";
import { UsernameField } from "./usernameField";

type SettingsTypeProps = {
  pds?: string;
};

export function Settings(props: SettingsTypeProps) {
  // attempt to pull the user's current PDS information.
  const placeholderPDS = props.pds ? props.pds : "https://bsky.social";
  return (
    <>
    <dialog id="changeInfo">
      <article>
        <header>
          <h5>Change Account Info</h5>
        </header>
        <p>Only fill in the textboxes that you want to change.<br />
          <b>NOTE</b>: Fields that contain no data in them will continue to use the old value.
        </p>
        <br />
        <section>
          <form id="settingsData" name="settingsData" hx-post="/account/update" hx-target="#accountResponse"
            hx-swap="innerHTML swap:1s" hx-indicator="#spinner" hx-disabled-elt="#settingsButtons button, find input" novalidate>

            <UsernameField required={false} title="BlueSky Handle:"
              hintText="Only change this if you have recently changed your Bluesky handle" />

            <label>
              Dashboard Pass:
              <DashboardPasswordField autocomplete={PWAutoCompleteSettings.CurrentPass} />
              <small>The password to access the {APP_NAME} Dashboard</small>
            </label>
            <label>
              BSky App Password:
              <BSkyAppPasswordField />
              <small>If you need to change your bsky application password, you can
                <a href="https://bsky.app/settings/app-passwords" target="_blank">get a new one here</a>.</small>
            </label>
            <label>
              BSky PDS:
              <input type="text" name="bskyUserPDS" placeholder={placeholderPDS} />
              <small>If you have not changed your PDS (or do not know what that means), you should leave this blank!</small>
            </label>
          </form>
          <progress id="spinner" class="htmx-indicator" />
          <div id="accountResponse">
          </div>
        </section>
        <footer id="settingsButtons">
          <button id="deleteAccountButton" class="btn-error">Delete Account</button>
          <button form="settingsData">Save</button>
          <button class="secondary" id="closeSettingsButton">Cancel</button>
        </footer>
      </article>
    </dialog>
    <dialog id="deleteAccount">
      <article>
        <header>Delete Account</header>
        <p>To delete your {APP_NAME} account, please type your password below.<br />
            All pending, scheduled posts + all unposted media will be deleted from this service.

          <center><strong>NOTE</strong>: THIS ACTION IS <u>PERMANENT</u>.</center>
        </p>
        <form id="delAccountForm" name="delAccountForm" hx-post="/account/delete"
            hx-target="#accountDeleteResponse" hx-disabled-elt="#accountDeleteButtons button, find input"
            hx-swap="innerHTML swap:1s" hx-indicator="#delSpinner" novalidate>
          <label>
            Dashboard Pass: <input id="deleteAccountPass" type="password" name="password"
              minlength={MIN_DASHBOARD_PASS} maxlength={MAX_DASHBOARD_PASS} />
            <small>The password to access the {APP_NAME} Dashboard</small>
          </label>
        </form>
        <progress id="delSpinner" class="htmx-indicator" />
          <div id="accountDeleteResponse">
          </div>
        <footer id="accountDeleteButtons">
          <button class="btn-error" form="delAccountForm">Delete</button>
          <button class="secondary" id="closeDeleteButton">Cancel</button>
        </footer>
      </article>
    </dialog>
    <script type="text/javascript" src={settingsScriptStr}></script>
    </>
  );
}

export function SettingsButton() {
  return (
    <button class="outline contrast" id="settingsButton">
      <span>Account Settings</span>
      <img src="/icons/settings.svg" alt="settings gear" />
    </button>
  )
}