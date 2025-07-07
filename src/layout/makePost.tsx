import { html } from "hono/html";
import { MAX_LENGTH, MAX_REPOST_INTERVAL } from "../limits.d"

export default function PostCreation() {
  return (
      <>
      <script src="https://unpkg.com/dropzone@6.0.0-beta.2/dist/dropzone-min.js"></script>
      <script src="https://unpkg.com/countable@3.0.1/Countable.min.js"></script>
      <link href="https://unpkg.com/dropzone@6.0.0-beta.2/dist/dropzone.css" rel="stylesheet" type="text/css" />
      <div class="p-6 border rounded-xl shadow-xl ring ring-gray-900/5 dark:shadow-gray-700 pb-2 bg-white dark:bg-gray-800 my-4 mx-4 sm:ml-0" style="height: calc(90vh - 2rem)">
        <form id="postForm" class="sm:container md:mx-auto flex flex-col h-full">
          <h1 class="text-2xl font-bold mb-6">Schedule New Post</h1>
          <label class="form-control mb-4 flex flex-1 flex-col h-48">
            <div class="label">
              <span class="label-text">Content</span>
            </div>
            <textarea id="content" class="textarea textarea-bordered" rows={20} style="resize: none" placeholder="Post text here" required></textarea>
            <div id="count" title="Any submissions with text over 300 characters will be automatically made into a thread with 300 characters per post">0/{MAX_LENGTH}</div>
          </label>

          <div class="label">
            <span class="label-text">Images</span>
          </div>
          <div class="form-control flex h-60 input input-bordered mb-2" id="imgArea">
            <div class="h-full gap-2 form-control min-h-20" id="imageUploads"></div>
          </div>

          <div id="content-label-selector" class="hidden">
            <label class="input input-bordered flex items-center gap-2 mb-2">
              Content Label
              <select name="label" id="contentLabels" class="ml-2 mr-2 bg-gray-50 border border-gray-300 text-gray-900 p-1 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                <option value="None">None</option>
                <option value="Suggestive">Suggestive</option>
                <option value="Nudity">Nudity (non-sexual nudity)</option>
                <option value="Adult">Adult (porn)</option>
                <option value="Graphic">Graphic Media (gore/violence)</option>
              </select>
            </label>
          </div>

          <div class="label">
            <span class="label-text">Scheduling</span>
          </div>
          <div class="vstack block">
            <div class="rounded-lg dark:bg-gray-950 px-2 py-2 shadow-xl ring ring-gray-900/5 hstack mb-2 gap-3 md:flex">
              <label class="label sm:block">
                Schedule Date
                <input type="datetime-local" id="scheduledDate" class="input sm:block md:grow" placeholder="" required />
              </label>
              <label class="ms-auto label">
                Make Post Now?
                <input type="checkbox" class="checkbox-xs ml-3" id="postNow" />
                
              </label>
            </div>
            <p class="text-sm mb-4 italic px-2 text-base-content text-wrap">You can schedule posts in the future, hourly. Minutes are rounded down.</p>
          </div>

          <div class="label">
            <span class="label-text">Reposting</span>
          </div>
          <div class="block rounded-lg dark:bg-gray-950 px-2 py-4 shadow-xl ring ring-gray-900/5 hstack mb-2 gap-3 md:flex">
            <label class="label pl-2">
              <input class="mr-2 checkbox-xs" type="checkbox" id="makeReposts" /> Should Repost? 
            </label>
            <div class="ms-auto label text-wrap" id="repostScheduleSimple">
                Repost this every 
                <select id="hoursInterval" class="ml-2 mr-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1 block dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" disabled>
                  {[...Array(24)].map((x, i) => {
                    if (i == 0) return;
                    return (<option value={i}>{i}</option>);
                  })}
                </select> hours 
                <select id="timesInterval" class="ml-2 mr-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1 block dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" disabled>
                  {[...Array(MAX_REPOST_INTERVAL)].map((x, i) => {
                    if (i == 0) return;
                    return (<option value={i}>{i}</option>);
                  })}
                </select> times from the post time.
            </div>
          </div>

          <button type="submit" class="w-full btn btn-primary btn-outline mt-2 mb-2">
            Schedule Post
          </button>
        </form>
      </div>
      
      <script>
      {html`
        const MAX_LENGTH=${MAX_LENGTH};
        updateAllTimes();
      `}
      </script>
      <script src="/postHelper.js"></script>
      </>
  );
}