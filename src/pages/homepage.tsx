import FooterCopyright from "../layout/helpers/footer";
import NavTags from "../layout/helpers/navTags";
import { BaseLayout } from "../layout/main";
import {
  MAX_POSTS_PER_THREAD, MAX_REPOST_DAYS, MAX_REPOST_IN_HOURS,
  MAX_REPOST_INTERVAL, R2_FILE_SIZE_LIMIT_IN_MB
} from "../limits";
import { APP_NAME, APP_REPO } from "../siteinfo";

export default function Homepage() {
  return (<BaseLayout title="Home" mainClass="homepage">
    <NavTags />
    <section class="container">
      <article>
        <noscript><header>Javascript is required to use this website!</header></noscript>
        <p>
          <strong>{APP_NAME}</strong> is a
          free, <a href={APP_REPO} rel="nofollow" target="_blank">open source</a> service
          that allows you to schedule and automatically repost your content on Bluesky!<br />
          Boost engagement and reach more people no matter what time of day!<br />
          <center>
            <figure>
              <img
                src="/dashboard.png"
                fetchpriority="high"
                alt={`Picture of ${APP_NAME} Dashboard`}
                height="618px"
                width="1200px"
              />
              <figcaption>
                {APP_NAME} is full of features to help wrangle your social media.
              </figcaption>
            </figure>
          </center>
          <hr />
          <h6 class="inline-header">Features:</h6>
          <ul>
            <li>Handles multiple users/accounts easily, supports most PDS instances</li>
            <li>Schedule your posts any time in the future (to the nearest hour)</li>
            <li>Supports embeds, quote posts, links, tagging, mentions</li>
            <li>Post <span data-tooltip={`images and video (up to ${R2_FILE_SIZE_LIMIT_IN_MB} MB)`}>media</span> with
              content labels and full support for alt text</li>
            <li>Schedule entire threads with support of up to {MAX_POSTS_PER_THREAD} posts per thread!</li>
            <li>Automatically retweet your content at an interval of your choosing, up to {MAX_REPOST_INTERVAL} times
              every {MAX_REPOST_IN_HOURS-1} hours (or {MAX_REPOST_DAYS} days)</li>
            <li>Edit the content of posts and alt text before they are posted</li>
          </ul>
        </p>
        <footer>
          <FooterCopyright />
        </footer>
      </article>
    </section>
  </BaseLayout>);
};