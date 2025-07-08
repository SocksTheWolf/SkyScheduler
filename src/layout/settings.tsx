import { html } from "hono/html";
import { BSKY_MAX_APP_PASSWORD_LENGTH, BSKY_MIN_USERNAME_LENGTH, MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits.d";

export function Settings() {
  return (
    <dialog id="changeInfo">
      <article>
        <header>
          <h5>Change Account Info</h5>
        </header>
        <form id="settingsData" name="settingsData" hx-post="/account/update" hx-target="#accountResponse" hx-swap="innerHTML">
          <label>
            BSky Username: <input type="input" name="username" minlength={BSKY_MIN_USERNAME_LENGTH} />
            <small>Only change this if you have recently changed your bsky handle</small>
          </label>
          <label>
            Dashboard Pass: <input type="password" name="password" minlength={MIN_DASHBOARD_PASS} maxlength={MAX_DASHBOARD_PASS} />
            <small>The password to access this website</small>
          </label>
          <label>
            BSky App Password: <input type="password" name="bskyAppPassword" maxlength={BSKY_MAX_APP_PASSWORD_LENGTH} />
            <small>If you need to change your application password for whatever reason</small>
          </label>
        </form>
        <br />
        <center>
          <div id="accountResponse">
          </div>
        </center>
        <footer>
          <button form="settingsData">Save</button>
          <button class="secondary" onclick='closeModal(document.getElementById("changeInfo"));'>Cancel</button>
        </footer>
      </article>
    </dialog>
  );
}

export function SettingsButton() {
  return (
    <>
      <button class="outline contrast" id="settingsButton">
        Open Settings
      </button>
      <script src="/modal.js" type="application/javascript"></script>
      <script>
        {html`
          document.getElementById("settingsButton").addEventListener("click", (ev) => {
            ev.preventDefault();
            openModal(document.getElementById("changeInfo"));
          });
        `}
      </script>
    </>
  )
}