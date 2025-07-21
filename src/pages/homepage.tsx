import { BaseLayout } from "../layout/main";
import NavTags from "../layout/navTags";
import { MAX_HOURS_REPOSTING, MAX_REPOST_INTERVAL } from "../limits.d";

export default function Home() {
  const currentYear = new Date().getFullYear();
  return (
    <BaseLayout title="SkyScheduler - Home">
      <NavTags />
      <section class="container">
        <article>
          <p>
            <strong>SkyScheduler</strong> is a tool that lets you schedule and automatically repost your content on Bluesky!<br />
            Boost engagement and reach more people no matter what time of day!<br />
            <center>
              <figure>
                <img
                  src="/dashboard.png"
                  alt="Picture of SkyScheduler Dashboard"
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
              <li>Post images with content labels and fully support for alt text</li>
              <li>Create and schedule post threads</li>
              <li>Automatically repost your posts at an interval of your choosing, up to {MAX_REPOST_INTERVAL-1} times every {MAX_HOURS_REPOSTING-1} hours</li>
              <li>Edit the content of pending posts before they are posted</li>
            </ul>
          </p>
          <footer><small>
            <a class="secondary" target="_blank" href="https://github.com/SocksTheWolf/SkyScheduler">SkyScheduler</a> &copy; {currentYear} 
            <span class="credits"><a href="https://socksthewolf.com">SocksTheWolf</a> -
            <a class="secondary" target="_blank" href="https://ko-fi.com/socksthewolf">Tip/Donate</a></span>
          </small></footer>
        </article>
      </section>
    </BaseLayout>
  );
}