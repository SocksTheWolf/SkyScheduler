// Helper footer for various pages
type FooterCopyrightProps = {
  inNewWindow?: boolean;
  showHomepage?: boolean;
}

export default function FooterCopyright(props: FooterCopyrightProps) {
  const newWinAttr = props.inNewWindow ? {"target": '_blank'} : {};
  const projectURL = (<a class="secondary" target="_blank" title="Project source on GitHub" href="https://github.com/SocksTheWolf/SkyScheduler">SkyScheduler</a>);
  const homepageURL = (<a class="secondary" title="Homepage" href="/">SkyScheduler</a>);
  return (
    <center><small> 
      {props.showHomepage ? homepageURL : projectURL} &copy; {new Date().getFullYear()} 
      <span class="credits">
        <a rel="author" target="_blank" title="Project author" href="https://socksthewolf.com">SocksTheWolf</a><br />
        <small>
          <a class="secondary" target="_blank" title="Tip the project maintainer" href="/tip">Tip</a> - 
          <a class="secondary" {...newWinAttr} href="/tos" title="Terms of Service">Terms</a> - 
          <a class="secondary" {...newWinAttr} href="/privacy" title="Privacy Policy">Privacy</a>
        </small>
      </span>
    </small></center>
  );
}