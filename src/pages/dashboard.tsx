import { ScriptInclusionLevel } from "../enums";
import LogoutButton from "../layout/buttons/logout";
import RefreshPostsButton from "../layout/buttons/refresh";
import ScrollToContent from "../layout/buttons/scroll";
import SettingsButton from "../layout/buttons/settings";
import AltTextDialog from "../layout/dialogs/altTextDialog";
import SettingsDialog from "../layout/dialogs/settingsDialog";
import FooterCopyright from "../layout/helpers/footer";
import LogoImage from "../layout/helpers/logo";
import { BaseLayout } from "../layout/main";
import { PostCreation } from "../layout/makePost";
import { RepostCreation } from "../layout/makeRepost";
import { ViolationNoticeBar } from "../layout/violationsBar";
import { APP_NAME, DASHBOARD_TAG_LINE, SHOW_SUPPORT_PROGRESS_BAR } from "../siteinfo";
import { dashboardScriptStr } from "../statics/appScripts";
import type { AllContext, BaseElementProps } from "../types";

export default function Dashboard(props: BaseElementProps) {
  if (props.ctx === undefined)
    return (<b class="btn-error">Failed: Server Error</b>);

  const ctx: AllContext = props.ctx!;
  return (<BaseLayout title="Dashboard" nonce={ctx.get("secureHeadersNonce")} mainClass="dashboard"
      interactivity={ScriptInclusionLevel.DashboardApp}
      preloads={[{href: dashboardScriptStr, type: "script"}]}>
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
              Account: <b id="currentUser" hx-get="/account/data" hx-target="this"
                hx-trigger="accountUpdated from:body, load once"></b></small>
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
        <ViolationNoticeBar ctx={ctx} forceLoad={true} />
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
    <SettingsDialog />
    <script type="text/javascript" src={dashboardScriptStr} nonce={ctx.get("secureHeadersNonce")}></script>
  </BaseLayout>);
};