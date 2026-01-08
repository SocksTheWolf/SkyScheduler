import { Context } from "hono";
import { AltTextDialog } from "../layout/altTextModal";
import { DependencyTags } from "../layout/depTags";
import FooterCopyright from "../layout/footer";
import { BaseLayout } from "../layout/main";
import { PostCreation, PreloadPostCreation } from "../layout/makePost";
import { ScheduledPostList } from "../layout/postList";
import { Settings, SettingsButton } from "../layout/settings";
import { ViolationNoticeBar } from "../layout/violationsBar";
import { PreloadRules } from "../types.d";

function RefreshPostIcon() {
  return (
    <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 3V8M3 8H8M3 8L6 5.29168C7.59227 3.86656 9.69494 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.71683 21 4.13247 18.008 3.22302 14" stroke="#ffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
  );
}

export default function Dashboard(props:any) {
  const ctx: Context = props.c;
  const defaultDashboardPreloads: PreloadRules[] = [
    {href: "/dep/countable.min.js", type: "script"},
    {href: "/dep/form-json.min.js", type: "script"},
    {href: "/dep/modal.js", type: "script"}
  ];
  
  return (
    <BaseLayout title="SkyScheduler - Dashboard" mainClass="dashboard" 
      preloads={[...PreloadPostCreation, ...defaultDashboardPreloads]}>
      <DependencyTags scripts={defaultDashboardPreloads} />
      <div class="grid">
        <section class="max-width-50">
          <article>
            <header>
              <h4>SkyScheduler Dashboard</h4>
              <div class="sidebar-block">
                <small><i>Schedule Bluesky posts effortlessly</i>.</small><br />
                <small>Account: <b class="truncate" id="currentUser" hx-get="/account/username" 
                  hx-trigger="accountUpdated from:body, load once" hx-target="this"></b></small>
              </div>
              <center class="controls">
                <button id="refresh-posts" hx-get="/post/all" hx-target="#posts" hx-trigger="click throttle:3s" 
                    hx-on-htmx-before-request="this.classList.add('svgAnim');" 
                    hx-on-htmx-after-request="setTimeout(() => {this.classList.remove('svgAnim')}, 3000)">
                  <span>Refresh Posts</span>
                  <RefreshPostIcon />
                </button>
                <SettingsButton />
              </center>
              <hr />
              <h5>Post List:</h5>
            </header>
            <div id="posts">
              <ScheduledPostList ctx={ctx} />
            </div>
            <footer>
              <div>
                <button class="outline w-full btn-error" hx-post="/account/logout" hx-target="body">
                  Logout
                </button>
              </div>
              <hr />
              <FooterCopyright inNewWindow={true} />
            </footer>
          </article>
        </section>
        <div class="container-fluid mainContent">
          <AltTextDialog />
          <ViolationNoticeBar ctx={ctx} />
          <PostCreation />
        </div>
      </div>
      <Settings />
      <span id="refresh-posts-force" hidden hx-get="/post/all" hx-target="#posts" hx-trigger="accountUpdated from:body, click" />
    </BaseLayout>
  );
}