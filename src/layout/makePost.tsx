import { MAX_LENGTH } from "../limits";
import { AllContext } from "../types";
import { ConstScriptStr } from "../utils/constScriptGen";
import { IncludeDependencyTags, PreloadRules } from "./helpers/includesTags";
import UploadInfo from "./helpers/uploadInfo";
import ContentLabelOptions from "./options/contentLabelOptions";
import RetweetOptions from "./options/retweetOptions";
import ScheduleOptions from "./options/scheduleOptions";

export const PreloadPostCreation: PreloadRules[] = [
  {type: "script", href: ConstScriptStr },
  {type: "script", href: "/dep/dropzone.min.js"},
  {type: "style", href: "/dep/dropzone.min.css"},
  {type: "style", href: "/css/dropzoneMods.css"},
  {type: "style", href: "/dep/tribute.css"},
  {type: "script", href: "/dep/tribute.min.js"}
];

type PostCreationProps = {
  ctx: AllContext;
}

export function PostCreation({ctx}: PostCreationProps) {
  const maxWidth: number|undefined = ctx.env.IMAGE_SETTINGS.max_width;
  return (<section>
    <IncludeDependencyTags scripts={PreloadPostCreation} />
    <article>
      <form id="postForm" novalidate>
        <header>
          <h4 id="postFormTitle"></h4>
          <small class="thread-cancel hidden" data-placement="left" data-tooltip="Cancel adding post to highlighted thread">
            <a id="cancelThreadPost" tabindex={0} class="contrast" role="button">Cancel Thread Post</a>
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
                  <UploadInfo width={maxWidth} />
                </footer>
              </article>
            </section>
            <section id="section-weblink">
              <article>
                <header><label for="urlCard">Link Embed</label></header>
                <input type="text" id="urlCard" placeholder="https://" value="" />
                <small>Add a social embed card for a link to your post. This link will not count against the {MAX_LENGTH} character limit.<br />
                Thumbnails may get automatically resized down to fit 1280x720.</small>
                <footer><div class="indent-10"><small><b>NOTE</b>: File uploads will <b>always supersede</b> any link embeds.</small></div></footer>
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
                <header><label for="recordBox">Insert Post/Feed/List Link</label></header>
                <input id="recordBox" placeholder="https://" title="Must be a link to a ATProto based record" />
                <small>Posts must be quotable and all record types must be resolvable (exist) upon the scheduled time. If it does not exist, it will not be attached to your post.</small>
              </article>
            </section>
          </details>
          <details id="section-postSchedule" open>
            <summary title="click to toggle section" role="button" class="outline secondary">Post Scheduling</summary>
            <ScheduleOptions allowNow={true} timeID="scheduledDate" checkboxID="postNow" type="post" />
          </details>

          <details id="section-retweet">
            <summary role="button" title="click to toggle section" class="secondary outline">Auto-Retweet</summary>
            <RetweetOptions id="makeReposts" contentType="post" />
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
  </section>);
}
