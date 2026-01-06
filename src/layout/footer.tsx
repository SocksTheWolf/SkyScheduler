// Helper footer for various pages
type FooterCopyrightProps = {
  inNewWindow?: boolean;
}

export default function FooterCopyright({inNewWindow}: FooterCopyrightProps) {
  const newWinAttr = inNewWindow ? {"target": '_blank'} : {};
  return (
    <center><small> 
      <a class="secondary" target="_blank" title="Project source on GitHub" href="https://github.com/SocksTheWolf/SkyScheduler">SkyScheduler</a> &copy; {new Date().getFullYear()} 
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