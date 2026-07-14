import LogoutButton from "../layout/buttons/logout";
import RefreshPostsButton from "../layout/buttons/refresh";
import ScrollToContent from "../layout/buttons/scroll";
import SettingsButton from "../layout/buttons/settings";
import AltTextDialog from "../layout/dialogs/altTextDialog";
import SettingsDialog from "../layout/dialogs/settingsDialog";
import FooterCopyright from "../layout/helpers/footer";
import { IncludeDependencyTags, PreloadRules } from "../layout/helpers/includesTags";
import LogoImage from "../layout/helpers/logo";
import { BaseLayout } from "../layout/main";
import { PostCreation, PreloadPostCreation } from "../layout/makePost";
import { RepostCreation } from "../layout/makeRepost";
import { ScheduledPostList } from "../layout/postList";
import { ViolationNoticeBar } from "../layout/violationsBar";
import { APP_NAME, DASHBOARD_TAG_LINE, SHOW_SUPPORT_PROGRESS_BAR } from "../siteinfo";
import type { AllContext, BaseElementProps } from "../types";
import { dashboardScriptStr, dashboardStyleStr } from "../statics/appScripts";

export default function Dashboard(props: BaseElementProps) {
  if (props.ctx === undefined)
    return (<b class="btn-error">Failed: Server Error</b>);

  const ctx: AllContext = props.ctx!;
  // 3rd party dependencies
  const defaultDashboardPreloads: PreloadRules[] = [
    {href: dashboardStyleStr, type: "style"},
    {href: "/dep/countable.min.js", type: "script"},
    {href: "/dep/form-json.min.js", type: "script"},
    {href: "/dep/modal.min.js", type: "script"},
    {href: "/dep/tabs.min.js", type: "script"},
    {href: "/dep/has.min.js", type: "script"}
  ];

  return (<BaseLayout title="Dashboard" ctx={ctx} mainClass="dashboard"
      preloads={[...PreloadPostCreation, ...defaultDashboardPreloads, {href: dashboardScriptStr, type: "script"}]}>
    <IncludeDependencyTags scripts={defaultDashboardPreloads} ctx={ctx} />
    <div class="row-fluid">
      <section class="col-3 sidebar">
        <article>
          <header>
            <div class="logoBox">
              <LogoImage width={64} height={64} />
              <h4>{APP_NAME} Dashboard</h4>
            </div>
            <div class="sidebar-block">
              <small><i>{DASHBOARD_TAG_LINE}</i>.<br />
              Account: <b id="currentUser" hx-get="/account/username"
                hx-trigger="accountUpdated from:body, load once" hx-target="this"></b></small>
            </div>
            <center class="postControls" role="group">
              <RefreshPostsButton />
              <SettingsButton />
              <ScrollToContent />
            </center>
            <hr class="hideOnMobile" />
            <h5>Post List:</h5>
          </header>
          <div id="posts">
            <ScheduledPostList ctx={ctx} />
          </div>
          <footer class="sidebarBottom">
            <LogoutButton />
            <hr />
            <FooterCopyright inNewWindow={true} showHomepage={true} showProgressBar={SHOW_SUPPORT_PROGRESS_BAR}
              showVersion={true} removeExcessTab={true} />
          </footer>
        </article>
      </section>
      <div class="col-9" id="appView">
        <ViolationNoticeBar ctx={ctx} />
        <div role="tablist" name="dashtabs">
          <button id="tabone" class="w-half" role="tab" aria-selected="true" aria-controls="postTab">New Post</button>
          <button id="tabtwo" class="w-half" role="tab" aria-controls="repostTab">New Retweet</button>
          <div id="postTab" role="tabpanel" aria-labelledby="tabone" >
            <PostCreation ctx={ctx} />
          </div>
          <div id="repostTab" role="tabpanel" aria-labelledby="tabtwo" hidden>
            <RepostCreation ctx={ctx} />
          </div>
        </div>
      </div>
    </div>
    <AltTextDialog />
    <SettingsDialog pds={ctx.get("pds")} />
    <script type="text/javascript" src={dashboardScriptStr}></script>
  </BaseLayout>);
};