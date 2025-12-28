import { html } from "hono/html";
import { MAX_LENGTH, CF_MAX_DIMENSION, CF_FILE_SIZE_LIMIT_IN_MB, MAX_REPOST_INTERVAL, MAX_HOURS_REPOSTING } from "../limits.d"

export default function PostCreation() {
  return (
  <section>
    <script src="/dep/dropzone-min.js"></script>
    <link href="/dep/dropzone.css" rel="stylesheet" type="text/css" />
    <link href="/dropzoneMods.css" rel="stylesheet" type="text/css" />
    <article>
      <form id="postForm">
        <header>
          <h4>Schedule New Post</h4>
        </header>
        <div>
          <article>
            <header>Post Content</header>
            <section>
              <textarea id="content" rows={8} style="resize: none" placeholder="Post text here" required></textarea>
              <small>Any text content with text over {MAX_LENGTH} characters will be automatically made into 
                a thread with {MAX_LENGTH} characters per post</small>
            </section>
            <footer>
              <small>Character Count: <div id="count">0/{MAX_LENGTH}</div></small>
            </footer>
          </article>

          <details>
            <summary role="button" title="click to toggle" class="secondary outline">Attach Media</summary>
            <section id="imageAttachmentSection">
              <article>
                <header>Images</header>
                <div id="imgArea">
                  <div id="imageUploads" class="dropzone">
                    <center class="dz-message">Drag or click here to upload images</center>
                  </div>
                </div>
                <footer>
                <div class="uploadGuidelines"><small>This tool cannot handle files larger than {CF_FILE_SIZE_LIMIT_IN_MB}MB or images with 
                  a res of {CF_MAX_DIMENSION}x{CF_MAX_DIMENSION} or higher. Images will be modified to fit Bluesky's requirements.</small></div>
                </footer>
              </article>
            </section>
            <section id="webLinkAttachmentSection">
              <article>
                <header>URL Embed</header>
                <input type="text" id="urlCard" placeholder="https://" value="" />
                <small>Add a social embed card for a link to your post. This link will not count against your {MAX_LENGTH} characters per post.</small>
                <footer><div class="uploadGuidelines"><small><b>NOTE</b>: Image media will supersede any links being posted.</small></div></footer>
              </article>
            </section>
            <section id="content-label-selector" class="hidden">
              <article>
                <header>Content Label</header>
                <select name="label" id="contentLabels">
                  <option disabled selected value=""> -- select an option -- </option>
                  <option value="None">Safe</option>
                  <option value="Suggestive">Suggestive</option>
                  <option value="Nudity">Nudity (non-sexual nudity)</option>
                  <option value="Adult">Adult (porn)</option>
                  <option disabled value="">---</option>
                  <option value="Graphic">Graphic Media (gore/violence)</option>
                </select>
                <small>Remember to set the appropriate content label for your content</small>
              </article>
            </section>
          </details>
          <details open>
            <summary title="click to toggle" role="button" class="outline secondary">Post Scheduling</summary>
            <section>
              <article>
                <header>Schedule Date</header>
                <input type="datetime-local" id="scheduledDate" placeholder="" required />
                <input type="checkbox" id="postNow" /> Make Post Now?
                <footer>
                  <small>
                    <i>You can schedule posts in the future, hourly. Time is rounded down to the nearest hour.</i>
                  </small>
                </footer>
              </article>
            </section>
          </details>

          <details>
            <summary role="button" title="click to toggle" class="secondary outline">Reposting</summary>
            <section>
            <input type="checkbox" id="makeReposts" /> Should Repost? 
            <center id="repostScheduleSimple">
                Automatically repost this content every 
                <select id="hoursInterval" disabled>
                  {[...Array(MAX_HOURS_REPOSTING)].map((x, i) => {
                    if (i == 0) return;
                    return (<option value={i}>{i}</option>);
                  })}
                </select> hours 
                <select id="timesInterval" disabled>
                  {[...Array(MAX_REPOST_INTERVAL)].map((x, i) => {
                    if (i == 0) return;
                    return (<option value={i}>{i}</option>);
                  })}
                </select> times from its posting.
            </center>
          </section>
          </details>
        </div>
        <footer>
          <button id="makingPostRequest" type="submit" class="w-full primary">
            Schedule Post
          </button>
        </footer>
      </form>
      <script type="text/javascript">
      {html`
        const MAX_LENGTH=${MAX_LENGTH};
        updateAllTimes();
      `}
      </script>
      <script type="text/javascript" src="/postHelper.js"></script>
    </article>
  </section>
  );
}
