import { html } from "hono/html";
import { MAX_LENGTH, MAX_REPOST_INTERVAL } from "../limits.d"

export default function PostCreation() {
  return (
  <section>
    <article>
      <header>
        <h4>Schedule New Post</h4>
      </header>
      <script src="https://unpkg.com/dropzone@6.0.0-beta.2/dist/dropzone-min.js"></script>
      <script src="https://unpkg.com/countable@3.0.1/Countable.min.js"></script>
      <link href="https://unpkg.com/dropzone@6.0.0-beta.2/dist/dropzone.css" rel="stylesheet" type="text/css" />
      <div>
        <form id="postForm">
          <article>
            <header>Post Content</header>
            <section>
              <textarea id="content" rows={10} style="resize: none" placeholder="Post text here" required></textarea>
              <small>Any text content with text over {MAX_LENGTH} characters will be automatically made into a thread with {MAX_LENGTH} characters per post</small>
            </section>
            <footer>
              Character Count: <div id="count">0/{MAX_LENGTH}</div>
            </footer>
          </article>

          <article>
            <header>Images</header>
            <section>
            <div id="imgArea">
              <div id="imageUploads" class="dropzone">
                <center class="dz-message">Drag or click here to upload images</center>
              </div>
            </div>
            </section>
            <section id="content-label-selector" class="hidden">
              <header>Content Label</header>
              <select name="label" id="contentLabels">
                <option value="None">None/Safe</option>
                <option value="Suggestive">Suggestive</option>
                <option value="Nudity">Nudity (non-sexual nudity)</option>
                <option value="Adult">Adult (porn)</option>
                <option value="Graphic">Graphic Media (gore/violence)</option>
              </select>
              <small>Remember to set the appropriate content label for your content</small>
            </section>
          </article>

          <article>
            <header>Scheduling</header>
            <section>
              Schedule Date
              <input type="datetime-local" id="scheduledDate" placeholder="" required />
            </section>
            <section>
              <input type="checkbox" id="postNow" />
              Make Post Now?
            </section>
            <footer>
              <small>
                <i>You can schedule posts in the future, hourly. Time is floored to the lowest hour.</i>
              </small>
            </footer>
          </article>

          <article>
            <header>Reposting</header>
            <section>
              <input type="checkbox" id="makeReposts" /> Should Repost? 
            </section>
            <center id="repostScheduleSimple">
                Automatically repost this content every 
                <select id="hoursInterval" disabled>
                  {[...Array(24)].map((x, i) => {
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
          </article>
        </form>
      </div>
      <footer>
        <button type="submit" class="w-full primary">
          Schedule Post
        </button>
      </footer>
      
      <script>
      {html`
        const MAX_LENGTH=${MAX_LENGTH};
        updateAllTimes();
      `}
      </script>
      <script src="/postHelper.js"></script>
    </article>
  </section>
  );
}