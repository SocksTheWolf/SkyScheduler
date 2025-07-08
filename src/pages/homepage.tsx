import { BaseLayout } from "../layout/main";
import NavTags from "../layout/navTags";

export default function Home() {
  return (
    <BaseLayout title="SkyScheduler - Home">
      <NavTags />
      <section class="container">
        <article>
          <p>
            <strong>SkyScheduler</strong> is a tool that lets you schedule and automatically repost your content automatically on Bluesky!<br />
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
              <li>Supports embeds, link embeds, tagging, mentions</li>
              <li>Post images with content labels and alt text</li>
              <li>Create and schedule threads of posts</li>
              <li>Automatically repost your posts at an interval of your choosing</li>
            </ul>
          </p>
          <footer><small><a class="secondary" target="_blank" href="https://github.com/SocksTheWolf/SkyScheduler">SkyScheduler</a> &copy; {new Date().getFullYear()} <a href="https://socksthewolf.com">SocksTheWolf</a></small></footer>
        </article>
      </section>
    </BaseLayout>
  );
}