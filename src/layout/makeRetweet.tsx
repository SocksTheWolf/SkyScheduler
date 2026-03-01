import { MAX_POSTED_LENGTH } from "../limits";
import RetweetOptions from "./options/retweetOptions";
import ScheduleOptions from "./options/scheduleOptions";

export function MakeRetweet() {
  return (<article>
    <header>
      <h4>Schedule New Retweet</h4>
    </header>
    <form id="repostForm" novalidate>
    <article>
      <header>Post To Retweet</header>
      <input type="text" id="repostRecordURL" placeholder="https://" />
      <small>This must be a post, it cannot be anything else.
        The post must also exist, and be reachable at the scheduled time
        (i.e. a post that's not deleted, nor are you forbidden from seeing it)</small>
      <blockquote id="repostTitleSection">
        <label for="repostTitle">Retweet Title <small>(Optional)</small></label>
        <input type="text" id="repostTitle" maxlength={MAX_POSTED_LENGTH} placeholder="Leave blank to use existing/generated title" />
        <small>A name or simple phrase to help you organize retweets. Max {MAX_POSTED_LENGTH} characters. Will update existing titles, cannot be used on scheduled posts.</small>
      </blockquote>
    </article>
    <ScheduleOptions timeID="repostTime" allowNow={false} type="retweet" header="Retweet At" />
    <article>
      <header>Retweet Cadance</header>
      <RetweetOptions id="makeRepostOptions" contentType="post" timeString="the time above" checkboxLabel="Should Retweet multiple times?" />
      <footer>This will schedule additional retweets starting from the time set in the previous section</footer>
    </article>
    <footer>
      <button id="makingRepostRequest" type="submit" class="w-full primary">Schedule Retweet</button>
    </footer>
  </form>
  </article>);
};