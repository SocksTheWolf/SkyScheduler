import {
  BSKY_IMG_FILE_EXTS,
  BSKY_IMG_SIZE_LIMIT_IN_MB,
  BSKY_VIDEO_FILE_EXTS,
  BSKY_VIDEO_MAX_DURATION,
  CF_IMAGES_FILE_SIZE_LIMIT_IN_MB,
  CF_IMAGES_MAX_DIMENSION,
  MAX_LENGTH,
  MAX_THUMBNAIL_SIZE,
  R2_FILE_SIZE_LIMIT_IN_MB
} from "../limits";
import { PreloadRules } from "../types.d";
import { ConstScriptPreload } from "../utils/constScriptGen";
import { ContentLabelOptions } from "./contentLabelOptions";
import { IncludeDependencyTags } from "./depTags";
import { RetweetOptions } from "./retweetOptions";
import { ScheduleOptions } from "./scheduleOptions";

export const PreloadPostCreation: PreloadRules[] = [
  ...ConstScriptPreload,
  {type: "script", href: "/dep/dropzone.min.js"},
  {type: "style", href: "/dep/dropzone.min.css"},
  {type: "style", href: "/css/dropzoneMods.css"},
  {type: "style", href: "/dep/tribute.css"},
  {type: "script", href: "/dep/tribute.min.js"}
];

export function PostCreation() {
  const bskyImageLimits = `Max file size of ${BSKY_IMG_SIZE_LIMIT_IN_MB}MB`;
  return (
  <section>
    <IncludeDependencyTags scripts={PreloadPostCreation} />
    <article>
      <form id="postForm" novalidate>
        <header>
          <h4 id="postFormTitle"></h4>
          <small class="btn-delete thread-cancel" data-tooltip="Cancel making post in thread">
            <a id="cancelThreadPost" tabindex={0} class="ghost secondary" role="button">Cancel Thread Post</a>
          </small>
        </header>
        <div>
          <article>
            <section role="form">
              <textarea id="content" rows={8} placeholder="Post Content" required aria-labelledby="post-content-label"></textarea>
              <label id="post-content-label" for="content">Post Content</label>
              <small class="smallLabel">Character Count: <span id="count">0/{MAX_LENGTH}</span></small>
            </section>
          </article>

          <details>
            <summary role="button" title="click to toggle section" class="secondary outline">Attach Media/Link</summary>
            <section id="section-imageAttachment">
              <article>
                <header>Files</header>
                <div>
                  <div id="fileUploads" class="dropzone">
                    <center class="dz-message">Drag or click here to upload files</center>
                  </div>
                </div>
                <footer>
                <div class="uploadGuidelines"><small><b>Note</b>: <ul>
                  <li><span data-tooltip={BSKY_IMG_FILE_EXTS}>Images</span>:
                  <ul>
                    <li>must be less than {CF_IMAGES_MAX_DIMENSION}x{CF_IMAGES_MAX_DIMENSION} pixels</li>
                    <li>must have a file size smaller than {CF_IMAGES_FILE_SIZE_LIMIT_IN_MB}MB (SkyScheduler will attempt to compress images to fit <span data-tooltip={bskyImageLimits}>BlueSky's requirements</span>)</li>
                    <li>thumbnails will only be shown here for images that are smaller than {MAX_THUMBNAIL_SIZE}MB</li>
                    <li>don't upload and fail, it's recommended to use a lower resolution file instead</li>
                  </ul></li>
                  <li><span data-tooltip={BSKY_VIDEO_FILE_EXTS}>Videos</span>:
                  <ul>
                    <li>must be shorter than {BSKY_VIDEO_MAX_DURATION} minutes</li>
                    <li>must be smaller than {R2_FILE_SIZE_LIMIT_IN_MB}MB</li>
                    <li>will be processed on BSky after they're posted. This may show a temporary "Video not Found"/black screen for a bit after posting.</li>
                  </ul></li>
                  </ul></small></div>
                </footer>
              </article>
            </section>
            <section id="section-weblink">
              <article>
                <header>Link Embed</header>
                <input type="text" id="urlCard" placeholder="https://" value="" />
                <small>Add a social embed card for a link to your post. This link will not count against the {MAX_LENGTH} character limit.<br />
                Thumbnails may get automatically resized down to fit 1280x720.</small>
                <footer><div class="uploadGuidelines"><small><b>NOTE</b>: File uploads will <b>always supersede</b> any link embeds.</small></div></footer>
              </article>
            </section>
            <section id="content-label-selector" class="hidden">
              <ContentLabelOptions id="contentLabels" />
            </section>
          </details>
          <details>
            <summary title="click to toggle section" role="button" class="outline secondary">Add Record (Quote Post)</summary>
            <section>
              <article>
                <header>Insert Post/Feed/List Link</header>
                <input id="recordBox" placeholder="https://" title="Must be a link to a ATProto powered record" />
                <small>Posts must be quotable and all record types must exist upon the scheduled time. If it does not exist, it will not be attached to your post.</small>
              </article>
            </section>
          </details>
          <details id="section-postSchedule" open>
            <summary title="click to toggle section" role="button" class="outline secondary">Post Scheduling</summary>
            <ScheduleOptions allowNow={true} timeID="scheduledDate" checkboxID="postNow" type="post" />
          </details>

          <details id="section-retweet">
            <summary role="button" title="click to toggle section" class="secondary outline">Auto-Retweet</summary>
            <RetweetOptions id="makeReposts" />
          </details>
          <input type="hidden" id="threadInfo" />
        </div>
        <footer>
          <button id="makingPostRequest" type="submit" class="w-full primary">
            Schedule Post
          </button>
        </footer>
      </form>
    </article>
  </section>
  );
}
