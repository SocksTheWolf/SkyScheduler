import { MAX_ALT_TEXT } from "../limits.d";

export function AltTextDialog() {
  return (
    <dialog id="altTextDialog" class="modal-lg">
      <article>
        <header><h3>Add Alt Text</h3></header>
        <section>
          <center>
            <img id="altThumbImg" />
          </center>
          <textarea id="altTextField" placeholder="Alt text for this image" maxlength={MAX_ALT_TEXT}></textarea>
          <small>Current Alt Text Length: <span id="altTextCount">0/{MAX_ALT_TEXT}</span></small>
        </section>
        <footer>
          <button id="altTextSaveButton">Save</button>
          <button id="altTextCancelButton" class="secondary">Cancel</button>
        </footer>
      </article>
    </dialog>
  );
};