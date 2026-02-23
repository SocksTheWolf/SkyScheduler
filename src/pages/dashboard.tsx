import { Context } from "hono";
import { AltTextDialog } from "../layout/altTextModal";
import FooterCopyright from "../layout/helpers/footer";
import { IncludeDependencyTags } from "../layout/helpers/includesTags";
import { LogoImage } from "../layout/helpers/logo";
import { BaseLayout } from "../layout/main";
import { PostCreation, PreloadPostCreation } from "../layout/makePost";
import { MakeRetweet } from "../layout/makeRetweet";
import { ScheduledPostList } from "../layout/postList";
import { Settings, SettingsButton } from "../layout/settings";
import { ViolationNoticeBar } from "../layout/violationsBar";
import { APP_NAME, SHOW_SUPPORT_PROGRESS_BAR } from "../siteinfo";
import { PreloadRules } from "../types";
import {
  dashboardScriptStr,
  settingsScriptStr
} from "../utils/appScripts";

export default function Dashboard(props:any) {
  const ctx: Context = props.c;
  // 3rd party dependencies
  const defaultDashboardPreloads: PreloadRules[] = [
    {href: "/css/dashboard.min.css", type: "style"},
    {href: "/dep/countable.min.js", type: "script"},
    {href: "/dep/form-json.min.js", type: "script"},
    {href: "/dep/modal.js", type: "script"},
    {href: "/dep/tabs.js", type: "script"}
  ];

  // Our own homebrew js files
  const dashboardScripts: PreloadRules[] = [dashboardScriptStr, settingsScriptStr].map((itm) => {
    return {href: itm, type: "script"};
  });
  return (
    <BaseLayout title="Dashboard" mainClass="dashboard"
      preloads={[...PreloadPostCreation, ...defaultDashboardPreloads, ...dashboardScripts]}>
      <IncludeDependencyTags scripts={defaultDashboardPreloads} />
      <div class="row-fluid">
        <section class="col-3">
          <article>
            <header>
              <div class="logoBox">
                <LogoImage />
                <h4>{APP_NAME} Dashboard</h4>
              </div>
              <div class="sidebar-block">
                <small><i>Schedule Bluesky posts effortlessly</i>.</small><br />
                <small>Account: <b id="currentUser" hx-get="/account/username"
                  hx-trigger="accountUpdated from:body, load once" hx-target="this"></b></small>
              </div>
              <center class="postControls">
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
                <button class="outline w-full btn-error logout" hx-post="/account/logout"
                  hx-target="body" hx-confirm="Are you sure you want to logout?">
                  Logout
                </button>
              </div>
              <hr />
              <FooterCopyright inNewWindow={true} showHomepage={true} showProgressBar={SHOW_SUPPORT_PROGRESS_BAR} />
            </footer>
          </article>
        </section>
        <div class="col-9">
          <ViolationNoticeBar ctx={ctx} />
          <div role="tablist">
            <button id="tabone" class="w-half" role="tab" aria-selected="true" aria-controls="postTab">New Post</button>
            <button id="tabtwo" class="w-half" role="tab" aria-controls="repostTab">New Retweet</button>
            <div id="postTab" role="tabpanel" aria-labelledby="tabone" >
              <PostCreation ctx={ctx} />
            </div>
            <div id="repostTab" role="tabpanel" aria-labelledby="tabtwo" hidden>
              <MakeRetweet />
            </div>
          </div>
        </div>
      </div>
      <AltTextDialog />
      <script type="text/javascript" src={dashboardScriptStr}></script>
      <Settings pds={ctx.get("pds")} />
    </BaseLayout>
  );
}