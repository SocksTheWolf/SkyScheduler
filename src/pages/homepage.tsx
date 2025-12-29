import FooterCopyright from "../layout/footer";
import { BaseLayout } from "../layout/main";
import NavTags from "../layout/navTags";
import { MAX_HOURS_REPOSTING, MAX_REPOST_INTERVAL } from "../limits.d";

export default function Home() {
  return (
    <BaseLayout title="SkyScheduler - Home">
      <NavTags />
      <section class="container">
        <article>
          <p>
            <strong>SkyScheduler</strong> is an <a href="https://github.com/socksthewolf/skyscheduler" rel="nofollow" target="_blank">open source</a> service that 
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
              <li>Handles multiple users/accounts easily</li>
              <li>Schedule your posts any time in the future (to the nearest hour)</li>
              <li>Supports embeds, links, tagging, mentions</li>
              <li>Post images with content labels and full support for alt text</li>
              <li>Automatically repost your posts at an interval of your choosing, up to {MAX_REPOST_INTERVAL-1} times every {MAX_HOURS_REPOSTING-1} hours</li>
              <li>Edit the content of pending posts before posting</li>
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