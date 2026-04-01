import {
  BSKY_IMG_FILE_EXTS,
  BSKY_IMG_SIZE_LIMIT_IN_MB,
  BSKY_VIDEO_FILE_EXTS,
  BSKY_VIDEO_MAX_DURATION,
  CF_IMAGES_FILE_SIZE_LIMIT_IN_MB,
  CF_IMAGES_MAX_DIMENSION,
  MAX_THUMBNAIL_SIZE,
  R2_FILE_SIZE_LIMIT_IN_MB
} from "../../limits";
import { APP_NAME } from "../../siteinfo";

type UploadInfoProps = {
  width?: number;
};

export default function UploadInfo({width}: UploadInfoProps) {
  const bskyImageLimits = `Max file size of ${BSKY_IMG_SIZE_LIMIT_IN_MB}MB`;
  return (<details class="uploadGuidelines noselect clicker hide-arrow" open>
    <summary tabindex={-1}>Upload Limits/Guidelines</summary>
    <small><ul>
      <li><span data-tooltip={BSKY_IMG_FILE_EXTS}>Images</span>:
        <ul>
          <li>must be less than {CF_IMAGES_MAX_DIMENSION}x{CF_IMAGES_MAX_DIMENSION} pixels</li>
          <li>must have a file size smaller than {CF_IMAGES_FILE_SIZE_LIMIT_IN_MB}MB ({APP_NAME} will attempt to compress images to fit <span data-tooltip={bskyImageLimits}>BlueSky's requirements</span>)
          {width ?
            <ol>
              <li>images over {BSKY_IMG_SIZE_LIMIT_IN_MB}MB with a width greater than <b>{width}px</b> will also <u data-tooltip="will preserve aspect ratio">be resized</u> in addition to being compressed</li>
            </ol> : null}
          </li>
          <li>thumbnails will only be shown here for images that are smaller than {MAX_THUMBNAIL_SIZE}MB</li>
          <li>if an image fails to upload, you'll need to manually adjust the file to fit it properly</li>
        </ul>
      </li>
      <li><span data-tooltip={BSKY_VIDEO_FILE_EXTS}>Videos</span>:
        <ul>
          <li>must be shorter than {BSKY_VIDEO_MAX_DURATION} minutes</li>
          <li>must be smaller than {R2_FILE_SIZE_LIMIT_IN_MB}MB</li>
          <li>are more likely to succeed if they are in h.264 (mp4) or qt format (mov)</li>
          <li>will be processed on your PDS after they're posted. This may show a temporary <i>"Video not Found"</i> message for a bit after posting.</li>
        </ul>
      </li>
    </ul></small>
    </details>);
};