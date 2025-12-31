import FooterCopyright from "../layout/footer";
import { BaseLayout } from "../layout/main";
import NavTags from "../layout/navTags";
import { MAX_HOURS_REPOSTING, MAX_REPOST_INTERVAL, CF_FILE_SIZE_LIMIT_IN_MB } from "../limits.d";

export default function Home() {
  return (
    <BaseLayout title="SkyScheduler - Home" mainClass="homepage">
      <NavTags />
      <section class="container">
        <article>
          <noscript><header>Javascript is required to use this website</header></noscript>
          <p>
            <strong>SkyScheduler</strong> is a free, <a href="https://github.com/socksthewolf/skyscheduler" rel="nofollow" target="_blank">open source</a> service that 
            lets you schedule and automatically repost your content on Bluesky!<br />
            Boost engagement and reach more people no matter what time of day!<br />
            <center>
              <figure>
                <img
                  src="/dashboard.png"
                  alt="Picture of SkyScheduler Dashboard"
                  height="619px"
                  width="1200px"
                />
                <figcaption>
                  An amazing picture of SkyScheduler's Dashboard
                </figcaption>
              </figure>
            </center>
            <h6 class="inline-header">Features:</h6>
            <ul>
              <li>Handles multiple users/accounts easily, supports custom PDS instances</li>
              <li>Schedule your posts any time in the future (to the nearest hour)</li>
              <li>Supports embeds, links, tagging, mentions</li>
              <li>Post <span data-tooltip={`images and video (up to ${CF_FILE_SIZE_LIMIT_IN_MB} MB)`}>media</span> with content labels and full support for alt text</li>
              <li>Automatically repost your posts at an interval of your choosing, up to {MAX_REPOST_INTERVAL-1} times every {MAX_HOURS_REPOSTING-1} hours</li>
              <li>Edit the content of pending posts before they are posted</li>
            </ul>
          </p>
          <footer>
            <FooterCopyright />
          </footer>
        </article>
      </section>
    </BaseLayout>
  );
}