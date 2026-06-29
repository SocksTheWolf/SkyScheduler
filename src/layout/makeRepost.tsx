import { MAX_REPOST_TITLE_LENGTH } from "../limits";
import type { BaseElementProps } from "../types";
import RepostOptions from "./options/repostOptions";
import ScheduleOptions from "./options/scheduleOptions";

export function RepostCreation(props?: BaseElementProps) {
  return (<article>
    <header>
      <h4>Schedule New Retweet</h4>
      <small class="thread-cancel hidden" data-placement="left" data-tooltip="Cancel adding retweet to highlighted post">
        <a id="cancelScheduledRepost" tabindex={0} class="contrast" role="button">Cancel Scheduled Retweet</a>
      </small>
    </header>
    <form id="repostForm" novalidate>
    <input type="hidden" id="postBaseInfo" />
    <article id="retweetFields">
      <header>Post To Retweet</header>
      <input type="text" id="repostRecordURL" placeholder="https://" />
      <small>This must be a post, it cannot be anything else.
        The post must also exist, and be reachable at the scheduled time
        (i.e. a post that's not deleted, nor are you forbidden from seeing it)</small>
      <blockquote id="repostTitleSection">
        <label for="repostTitle">Retweet Title <small>(Optional)</small></label>
        <input type="text" id="repostTitle" maxlength={MAX_REPOST_TITLE_LENGTH} placeholder="Leave blank to use existing/generated title" />
        <small>A name or simple phrase to help you organize retweets. Max {MAX_REPOST_TITLE_LENGTH} characters. 
          Will update existing titles, cannot be used on scheduled posts.</small>
      </blockquote>
    </article>
    <ScheduleOptions timeID="repostTime" allowNow={false} type="retweet" header="Retweet At" />
    <article>
      <header>Retweet Cadance</header>
      <RepostOptions id="makeRepostOptions" contentType="post" timeString="the time above" checkboxLabel="Should Retweet multiple times?" />
      <footer>This will schedule additional retweets starting from the time set in the previous section</footer>
    </article>
    <footer>
      <button id="makingRepostRequest" type="submit" class="w-full primary">Schedule Retweet</button>
    </footer>
  </form>
  </article>);
};