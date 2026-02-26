import { RetweetOptions } from "./options/retweetOptions";
import { ScheduleOptions } from "./options/scheduleOptions";

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
        It must also exist, and be reachable
        (i.e. a post that's not deleted, nor are you forbidden from seeing it)</small>
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