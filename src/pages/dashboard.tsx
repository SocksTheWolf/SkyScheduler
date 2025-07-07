import { Context } from "hono";
import PostCreation from "../layout/makePost";
import { BaseLayout } from "../layout";
import { ScheduledPostList } from "../layout/postList";

export default function Dashboard(props:any) {
  const ctx: Context = props.c;

  return (
    <BaseLayout title="Dashboard - SkyScheduler">
      <div class="grid">
        <section class="max-width-50">
          <article>
            <header>
              <h3>SkyScheduler manager</h3>
              <small>Schedule Bluesky posts effortlessly.</small>
              <br /><br />
              <center>
                <button id="refresh-posts" hx-get="/posts" hx-target="#posts" hx-swap="innerHTML" hx-trigger="click">
                  <span>Refresh Posts</span>
                  <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 3V8M3 8H8M3 8L6 5.29168C7.59227 3.86656 9.69494 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.71683 21 4.13247 18.008 3.22302 14" stroke="#ffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
                </button>
              </center>
              <br />
              <h3>Post List:</h3>
              <hr />
            </header>
            <div id="posts">
              <ScheduledPostList ctx={ctx} />
            </div>
            <footer>
              <div>
                <button class="outline w-full btn-error" hx-post="/logout" hx-target="body" hx-swap="innerHTML">
                  Logout
                </button>
              </div>
            </footer>
          </article>
        </section>
        <div class="container-fluid mainContent">
          <PostCreation />
        </div>
      </div>
    </BaseLayout>
  );
}