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
import { appScriptStrs } from "../utils/appScripts";

export default function Dashboard(props:any) {
  const ctx: Context = props.c;
  const defaultDashboardPreloads: PreloadRules[] = [
    {href: "/dep/countable.min.js", type: "script"},
    {href: "/dep/form-json.min.js", type: "script"},
    {href: "/dep/modal.js", type: "script"}
  ];

  const dashboardScripts: PreloadRules[] = appScriptStrs.map((itm) => {
    return {href: itm, type: "script"};
  });
  
  return (
    <BaseLayout title="SkyScheduler - Dashboard" mainClass="dashboard" 
      preloads={[...PreloadPostCreation, ...defaultDashboardPreloads, ...dashboardScripts]}>
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
                <button id="refresh-posts" hx-get="/post/all" hx-target="#posts" 
                    hx-trigger="refreshPosts from:body, accountUpdated from:body, click throttle:3s" 
                    hx-on-htmx-before-request="this.classList.add('svgAnim');" 
                    hx-on-htmx-after-request="setTimeout(() => {this.classList.remove('svgAnim')}, 3000)">
                  <span>Refresh Posts</span>
                  <img src="/icons/refresh.svg" alt="refresh icon" />
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
    </BaseLayout>
  );
}