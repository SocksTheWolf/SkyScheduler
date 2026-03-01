import { Context } from "hono";
import { AltTextDialog } from "../layout/altTextModal";
import LogoutButton from "../layout/buttons/logout";
import RefreshPostsButton from "../layout/buttons/refresh";
import SettingsButton from "../layout/buttons/settings";
import FooterCopyright from "../layout/helpers/footer";
import { IncludeDependencyTags, PreloadRules } from "../layout/helpers/includesTags";
import { LogoImage } from "../layout/helpers/logo";
import { BaseLayout } from "../layout/main";
import { PostCreation, PreloadPostCreation } from "../layout/makePost";
import { MakeRetweet } from "../layout/makeRetweet";
import { ScheduledPostList } from "../layout/postList";
import { Settings } from "../layout/settings";
import { ViolationNoticeBar } from "../layout/violationsBar";
import { APP_NAME, DASHBOARD_TAG_LINE, SHOW_SUPPORT_PROGRESS_BAR } from "../siteinfo";
import {
  dashboardScriptStr,
  settingsScriptStr
} from "../utils/appScripts";

export default function Dashboard(props: any) {
  const ctx: Context = props.c;
  // 3rd party dependencies
  const defaultDashboardPreloads: PreloadRules[] = [
    {href: "/css/dashboard.min.css", type: "style"},
    {href: "/dep/countable.min.js", type: "script"},
    {href: "/dep/form-json.min.js", type: "script"},
    {href: "/dep/modal.min.js", type: "script"},
    {href: "/dep/tabs.min.js", type: "script"}
  ];

  // Our own homebrew js files
  const dashboardScripts: PreloadRules[] = [dashboardScriptStr, settingsScriptStr].map((itm) => {
    return {href: itm, type: "script"};
  });
  return (<BaseLayout title="Dashboard" mainClass="dashboard"
      preloads={[...PreloadPostCreation, ...defaultDashboardPreloads, ...dashboardScripts]}>
    <IncludeDependencyTags scripts={defaultDashboardPreloads} />
    <div class="row-fluid">
      <section class="col-3">
        <article>
          <header>
            <div class="logoBox">
              <LogoImage width={64} height={64} />
              <h4>{APP_NAME} Dashboard</h4>
            </div>
            <div class="sidebar-block">
              <small><i>{DASHBOARD_TAG_LINE}</i>.</small><br />
              <small>Account: <b id="currentUser" hx-get="/account/username"
                hx-trigger="accountUpdated from:body, load once" hx-target="this"></b></small>
            </div>
            <center class="postControls">
              <RefreshPostsButton />
              <SettingsButton />
            </center>
            <hr />
            <h5>Post List:</h5>
          </header>
          <div id="posts">
            <ScheduledPostList ctx={ctx} />
          </div>
          <footer>
            <LogoutButton />
            <hr />
            <FooterCopyright inNewWindow={true} showHomepage={true} showProgressBar={SHOW_SUPPORT_PROGRESS_BAR} showVersion={true} />
          </footer>
        </article>
      </section>
      <div class="col-9">
        <ViolationNoticeBar ctx={ctx} />
        <div role="tablist" name="dashtabs">
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
  </BaseLayout>);
};