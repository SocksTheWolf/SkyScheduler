import { html } from "hono/html";
import { MAX_LENGTH, CF_MAX_DIMENSION, CF_FILE_SIZE_LIMIT_IN_MB, 
  MAX_REPOST_INTERVAL_LIMIT, MAX_REPOST_IN_HOURS, BSKY_VIDEO_MAX_DURATION, 
  BSKY_IMG_FILE_EXTS, BSKY_VIDEO_FILE_EXTS } from "../limits.d"
import { PreloadRules } from "../types.d";

export const PreloadPostCreation: PreloadRules[] = [
  {type: "script", href: "/js/consts.js"}, 
  {type: "script", href: "/dep/dropzone-min.js"}, 
  {type: "style", href: "/dep/dropzone.css"}, 
  {type: "style", href: "/css/dropzoneMods.css"},
  {type: "style", href: "/dep/tribute.css"},
  {type: "script", href: "/dep/tribute.min.js"}
];

export function PostCreation() {
  return (
  <section>
    <script type="text/javascript" src="/dep/dropzone-min.js"></script>
    <script type="text/javascript" src="/dep/tribute.min.js"></script>
    <script type="text/javascript" src="/js/consts.js"></script>
    <link href="/dep/dropzone.css" rel="stylesheet" type="text/css" />
    <link href="/dep/tribute.css" rel="stylesheet" type="text/css" />
    <link href="/css/dropzoneMods.css" rel="stylesheet" type="text/css" />
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
              <small>Character Count: <div id="count">0/{MAX_LENGTH}</div></small>
            </section>
          </article>

          <details>
            <summary role="button" title="click to toggle" class="secondary outline">Attach Media</summary>
            <section id="imageAttachmentSection">
              <article>
                <header>Files</header>
                <div>
                  <div id="fileUploads" class="dropzone">
                    <center class="dz-message">Drag or click here to upload files</center>
                  </div>
                </div>
                <footer>
                <div class="uploadGuidelines"><small><b>Note</b>: <ul>
                  <li>This tool cannot handle files larger than {CF_FILE_SIZE_LIMIT_IN_MB}MB</li>
                  <li><span data-tooltip={BSKY_IMG_FILE_EXTS}>Images</span> must have a resolution less than {CF_MAX_DIMENSION}x{CF_MAX_DIMENSION} pixels</li>
                  <li><span data-tooltip={BSKY_VIDEO_FILE_EXTS}>Videos</span> must be shorter than {BSKY_VIDEO_MAX_DURATION} minutes</li>
                  </ul></small></div>
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
                  {[...Array(MAX_REPOST_IN_HOURS)].map((x, i) => {
                    if (i == 0) return;
                    const dayStr = i % 24 === 0 ? ` (${i/24} day)` : '';
                    return (<option value={i}>{i}{dayStr}</option>);
                  })}
                </select> hours 
                <select id="timesInterval" disabled>
                  {[...Array(MAX_REPOST_INTERVAL_LIMIT)].map((x, i) => {
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
        updateAllTimes();
      `}
      </script>
      <script type="text/javascript" src="/js/postHelper.js"></script>
    </article>
  </section>
  );
}
