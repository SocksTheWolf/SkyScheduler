import { html } from "hono/html";
import { MAX_LENGTH, CF_MAX_DIMENSION, CF_IMAGES_FILE_SIZE_LIMIT_IN_MB, 
  MAX_REPOST_INTERVAL_LIMIT, MAX_REPOST_IN_HOURS, BSKY_VIDEO_MAX_DURATION, 
  BSKY_IMG_FILE_EXTS, BSKY_VIDEO_FILE_EXTS, BSKY_IMG_SIZE_LIMIT_IN_MB,
  R2_FILE_SIZE_LIMIT_IN_MB, MAX_THUMBNAIL_SIZE, 
  CURRENT_SCRIPT_VERSION, USE_SCRIPT_MIN } from "../limits.d"
import { PreloadRules } from "../types.d";
import { ConstScript, ConstScriptPreload } from "./constScript";

export const PreloadPostCreation: PreloadRules[] = [
  ...ConstScriptPreload,
  {type: "script", href: "/dep/dropzone-min.js"}, 
  {type: "style", href: "/dep/dropzone.min.css"}, 
  {type: "style", href: "/css/dropzoneMods.css"},
  {type: "style", href: "/dep/tribute.css"},
  {type: "script", href: "/dep/tribute.min.js"}
];

export function PostCreation() {
  const postHelperScriptStr: string = `/js/postHelper${USE_SCRIPT_MIN}.js?v=${CURRENT_SCRIPT_VERSION}`;
  const bskyImageLimits = `Max file size of ${BSKY_IMG_SIZE_LIMIT_IN_MB}MB`;
  return (
  <section>
    <script type="text/javascript" src="/dep/dropzone-min.js"></script>
    <script type="text/javascript" src="/dep/tribute.min.js"></script>
    <ConstScript />
    <link href="/dep/dropzone.min.css" rel="stylesheet" type="text/css" />
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
              <textarea id="content" rows={8} placeholder="Post text here" required></textarea>
              <small>Character Count: <span id="count">0/{MAX_LENGTH}</span></small>
            </section>
          </article>

          <details>
            <summary role="button" title="click to toggle section" class="secondary outline">Attach Media/Link</summary>
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
                  <li><span data-tooltip={BSKY_IMG_FILE_EXTS}>Images</span> 
                  <ul>
                    <li>must be less than {CF_MAX_DIMENSION}x{CF_MAX_DIMENSION} pixels</li>
                    <li>must have a file size smaller than {CF_IMAGES_FILE_SIZE_LIMIT_IN_MB}MB (SkyScheduler will attempt to compress images to fit <span data-tooltip={bskyImageLimits}>BlueSky's requirements</span>)</li>
                    <li>thumbnails will only be shown here for images that are smaller than {MAX_THUMBNAIL_SIZE}MB</li>
                    <li>don't upload and fail, it's recommended to use a lower resolution file instead</li>
                  </ul></li>
                  <li><span data-tooltip={BSKY_VIDEO_FILE_EXTS}>Videos</span> 
                  <ul>
                    <li>must be shorter than {BSKY_VIDEO_MAX_DURATION} minutes</li>
                    <li>must be smaller than {R2_FILE_SIZE_LIMIT_IN_MB}MB</li>
                    <li>will be processed on BSky after they're posted. This will show a temporary "Media not Found"/black screen for a bit after posting.</li>
                  </ul></li>
                  </ul></small></div>
                </footer>
              </article>
            </section>
            <section id="webLinkAttachmentSection">
              <article>
                <header>Link Embed</header>
                <input type="text" id="urlCard" placeholder="https://" value="" />
                <small>Add a social embed card for a link to your post. This link will not count against the {MAX_LENGTH} character limit.</small>
                <footer><div class="uploadGuidelines"><small><b>NOTE</b>: File uploads will <b>always supersede</b> any link embeds.</small></div></footer>
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
          <details>
            <summary title="click to toggle section" role="button" class="outline secondary">Add Record (Quote Post)</summary>
            <section>
              <article>
                <header>Post/Feed/List Link</header>
                <input id="recordBox" placeholder="https://" />
                <small>Posts must be quotable and all record types must exist upon the scheduled time. If it does not exist, it will not be attached to your post.</small>
              </article>
            </section>
          </details>
          <details open>
            <summary title="click to toggle section" role="button" class="outline secondary">Post Scheduling</summary>
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
            <summary role="button" title="click to toggle section" class="secondary outline">Auto-Retweet</summary>
            <section>
            <input type="checkbox" id="makeReposts" /> Should Auto-Retweet? 
            <center id="repostScheduleSimple">
                Automatically retweet this content every 
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
                </select> times from the post time.
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
      <script type="text/javascript" src={postHelperScriptStr}></script>
    </article>
  </section>
  );
}
