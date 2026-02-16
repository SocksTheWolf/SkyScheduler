import { PROGRESS_MADE, PROGRESS_TOTAL } from "../../progress";

// Helper footer for various pages
type FooterCopyrightProps = {
  inNewWindow?: boolean;
  showHomepage?: boolean;
  showProgressBar?: boolean;
}

export default function FooterCopyright(props: FooterCopyrightProps) {
  const newWinAttr = props.inNewWindow ? {"target": '_blank'} : {};
  const projectURL = (<a class="secondary" target="_blank" title="Project source on GitHub"
    href="https://github.com/SocksTheWolf/SkyScheduler">SkyScheduler</a>);
  const homepageURL = (<a class="secondary" title="Homepage" href="/">SkyScheduler</a>);
  const progressBarTooltip = `$${PROGRESS_MADE}/$${PROGRESS_TOTAL} for this month`;
  return (
    <center><small>
      {props.showProgressBar ? <div class="serverFunds"><span data-tooltip={progressBarTooltip}>Current Server Costs:</span>
        <progress value={PROGRESS_MADE} max={PROGRESS_TOTAL} /></div> : null}
      {props.showHomepage ? homepageURL : projectURL} &copy; {new Date().getFullYear()}
      <span class="credits">
        <a rel="author" target="_blank" title="Project author" href="https://socksthewolf.com">SocksTheWolf</a><br />
        <small>
          <a class="secondary" target="_blank"
            data-tooltip="Tips are not required, the service is free, but if you like this service they are appreciated <3"
            title="Tip the dev" href="/tip">Tip</a> -
          <a class="secondary" {...newWinAttr} href="/tos" title="Terms of Service">Terms</a> -
          <a class="secondary" {...newWinAttr} href="/privacy" title="Privacy Policy">Privacy</a>
        </small>
      </span>
    </small></center>
  );
}