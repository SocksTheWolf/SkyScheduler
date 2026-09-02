import isEmpty from "just-is-empty";
import {
  APP_NAME,
  PROJECT_AUTHOR, PROJECT_AUTHOR_SITE,
  SERVICE_TIP_URL
} from "../../appInfo";
import { CURRENT_SCRIPT_VERSION } from "../../statics/appScripts";
import { CONST_SCRIPT_VERSION } from "../../statics/constScript";
import type { BaseElementProps } from "../../types";

// Helper footer for various pages
type FooterCopyrightProps = BaseElementProps & {
  inNewWindow?: boolean;
  showHomepage?: boolean;
  showProgressBar?: boolean;
  showVersion?: boolean;
  removeExcessTab?: boolean;
}

export default function FooterCopyright(props: FooterCopyrightProps) {
  const newWinAttr = props.inNewWindow ? {"target": '_blank'} : {};
  const projectURL = (<a class="secondary" tabindex={props.removeExcessTab ? -1 : 0} target="_blank" title="Project source repository"
    href="/source">{APP_NAME}</a>);
  const homepageURL = (<a class="secondary" title="Homepage" href="/">{APP_NAME}</a>);
  const tipElement = (<><a class="tipLink secondary" target="_blank" tabindex={props.removeExcessTab ? -1 : 0}
      data-tooltip="Tips are not required as the service is free, but if this helps you, a tip would be appreciated <3"
      title="Tip the dev" href="/tip">Tip</a> -</>);
  return (
    <center><small>
      {props.showProgressBar ? <div class="serverFunds" hx-get="/progress" hx-trigger="load once" hx-target="this" hx-swap="innerHTML"></div> : null}
      {props.showHomepage ? homepageURL : projectURL} &copy; {new Date().getFullYear()}
      <span class="credits">
        <a rel="author" target="_blank" title="Project author" tabindex={props.removeExcessTab ? -1 : 0}
          href={PROJECT_AUTHOR_SITE}>{PROJECT_AUTHOR}</a><br />
        <small>
          {!isEmpty(SERVICE_TIP_URL) ? tipElement : undefined}
          <a class="secondary" {...newWinAttr} href="/tos" title="Terms of Service">Terms</a> -
          <a class="secondary" {...newWinAttr} href="/privacy" title="Privacy Policy">Privacy</a> -
          <a class="secondary" target="_blank" href="/contact" title="Contact">Contact</a>
          {props.showVersion ? <span><br /><small class="secondary">version {CURRENT_SCRIPT_VERSION} (v{CONST_SCRIPT_VERSION} definitions)</small></span> : null}
        </small>
      </span>
    </small></center>
  );
}