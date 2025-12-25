import { html } from "hono/html";
import { BSKY_MAX_APP_PASSWORD_LENGTH, MAX_DASHBOARD_PASS, MIN_DASHBOARD_PASS } from "../limits.d";
import UsernameField from "./usernameField";

export function Settings() {
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
            hx-swap="innerHTML" hx-indicator="#spinner">

            <UsernameField required={false} title="BlueSky Handle:" hintText="Only change this if you have recently changed your Bluesky handle" />

            <label>
              Dashboard Pass: 
              <input type="password" name="password" minlength={MIN_DASHBOARD_PASS} maxlength={MAX_DASHBOARD_PASS} />
              <small>The password to access this website</small>
            </label>
            <label>
              BSky App Password: 
              <input type="password" name="bskyAppPassword" maxlength={BSKY_MAX_APP_PASSWORD_LENGTH} />
              <small>If you need to change your application password for whatever reason</small>
            </label>
            <label>
              BSky PDS: 
              <input type="text" name="bskyUserPDS" placeholder="https://bsky.social" />
              <small>If you have not changed your PDS (or do not know what that means), you should leave this blank</small>
            </label>
          </form>
          <br />
          <progress id="spinner" class="htmx-indicator" />
          <center>
            <div id="accountResponse">
            </div>
          </center>
        </section>
        <footer>
          <button id="deleteAccountButton" class="btn-error" style="float: left;">Delete</button>
          <button form="settingsData">Save</button>
          <button class="secondary" onclick='closeSettingsModal();'>Cancel</button>
        </footer>
      </article>
    </dialog>
    <dialog id="deleteAccount">
      <article>
        <header>Delete Account</header>
        <p>To delete your SkyScheduler account, please type your password below.<br />
          <center><strong>NOTE</strong>: THIS ACTION IS <u>PERMANENT</u>.</center>
        </p>
        <form id="delAccountForm" name="delAccountForm" hx-post="/account/delete" hx-target="#accountDelete" 
            hx-swap="innerHTML" hx-indicator="#delSpinner">
          <label>
            Dashboard Pass: <input type="password" name="password" minlength={MIN_DASHBOARD_PASS} maxlength={MAX_DASHBOARD_PASS} />
            <small>The password to access this website</small>
          </label>
        </form>
        <br />
        <progress id="delSpinner" class="htmx-indicator" />
        <center>
          <div id="accountDelete">
          </div>
        </center>
        <footer>
          <button class="btn-error" form="delAccountForm">Delete</button>
          <button class="secondary" onclick='closeDeleteModal();'>Cancel</button>
        </footer>
      </article>
    </dialog>
    <script type="text/javascript">{html`
      addUnicodeRemoval();
      document.getElementById("deleteAccountButton").addEventListener("click", (ev) => {
        ev.preventDefault();
        openModal(document.getElementById("deleteAccount"));
      });
    `}</script>
    </>
  );
}

export function SettingsButton() {
  return (
    <>
      <button class="outline contrast" id="settingsButton">
        <span>Account Settings</span>
        <svg style="fill: #FFFFFF" height="20px" width="20px" version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve" fill="#FFFFFF" stroke="#FFFFFF"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path class="st0" d="M502.325,307.303l-39.006-30.805c-6.215-4.908-9.665-12.429-9.668-20.348c0-0.084,0-0.168,0-0.252 c-0.014-7.936,3.44-15.478,9.667-20.396l39.007-30.806c8.933-7.055,12.093-19.185,7.737-29.701l-17.134-41.366 c-4.356-10.516-15.167-16.86-26.472-15.532l-49.366,5.8c-7.881,0.926-15.656-1.966-21.258-7.586 c-0.059-0.06-0.118-0.119-0.177-0.178c-5.597-5.602-8.476-13.36-7.552-21.225l5.799-49.363 c1.328-11.305-5.015-22.116-15.531-26.472L337.004,1.939c-10.516-4.356-22.646-1.196-29.701,7.736l-30.805,39.005 c-4.908,6.215-12.43,9.665-20.349,9.668c-0.084,0-0.168,0-0.252,0c-7.935,0.014-15.477-3.44-20.395-9.667L204.697,9.675 c-7.055-8.933-19.185-12.092-29.702-7.736L133.63,19.072c-10.516,4.356-16.86,15.167-15.532,26.473l5.799,49.366 c0.926,7.881-1.964,15.656-7.585,21.257c-0.059,0.059-0.118,0.118-0.178,0.178c-5.602,5.598-13.36,8.477-21.226,7.552 l-49.363-5.799c-11.305-1.328-22.116,5.015-26.472,15.531L1.939,174.996c-4.356,10.516-1.196,22.646,7.736,29.701l39.006,30.805 c6.215,4.908,9.665,12.429,9.668,20.348c0,0.084,0,0.167,0,0.251c0.014,7.935-3.44,15.477-9.667,20.395L9.675,307.303 c-8.933,7.055-12.092,19.185-7.736,29.701l17.134,41.365c4.356,10.516,15.168,16.86,26.472,15.532l49.366-5.799 c7.882-0.926,15.656,1.965,21.258,7.586c0.059,0.059,0.118,0.119,0.178,0.178c5.597,5.603,8.476,13.36,7.552,21.226l-5.799,49.364 c-1.328,11.305,5.015,22.116,15.532,26.472l41.366,17.134c10.516,4.356,22.646,1.196,29.701-7.736l30.804-39.005 c4.908-6.215,12.43-9.665,20.348-9.669c0.084,0,0.168,0,0.251,0c7.936-0.014,15.478,3.44,20.396,9.667l30.806,39.007 c7.055,8.933,19.185,12.093,29.701,7.736l41.366-17.134c10.516-4.356,16.86-15.168,15.532-26.472l-5.8-49.366 c-0.926-7.881,1.965-15.656,7.586-21.257c0.059-0.059,0.119-0.119,0.178-0.178c5.602-5.597,13.36-8.476,21.225-7.552l49.364,5.799 c11.305,1.328,22.117-5.015,26.472-15.531l17.134-41.365C514.418,326.488,511.258,314.358,502.325,307.303z M281.292,329.698 c-39.68,16.436-85.172-2.407-101.607-42.087c-16.436-39.68,2.407-85.171,42.087-101.608c39.68-16.436,85.172,2.407,101.608,42.088 C339.815,267.771,320.972,313.262,281.292,329.698z"></path> </g> </g></svg>
      </button>
      <script src="/dep/modal.js" type="application/javascript"></script>
      <script type="text/javascript">
        {html`
          document.getElementById("settingsButton").addEventListener("click", (ev) => {
            ev.preventDefault();
            openModal(document.getElementById("changeInfo"));
          });
          function closeSettingsModal() {
            closeModal(document.getElementById("changeInfo"));
          }
          function closeDeleteModal() {
            closeModal(document.getElementById("deleteAccount"));
          }
        `}
      </script>
    </>
  )
}