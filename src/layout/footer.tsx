// Helper footer for various pages
export default function FooterCopyright() {
  return (
    <small> 
      <a class="secondary" target="_blank" title="project source on github" href="https://github.com/SocksTheWolf/SkyScheduler">SkyScheduler</a> &copy; {new Date().getFullYear()} 
      <span class="credits">
        <a rel="author" title="project author" href="https://socksthewolf.com">SocksTheWolf</a> -
        <a class="secondary" target="_blank" title="tip project maintainer" href="https://ko-fi.com/socksthewolf">Tip</a> - 
        <a class="secondary" href="/tos" title="Terms of Service document">Terms</a> - 
        <a class="secondary" href="/privacy" title="Privacy Policy document">Privacy</a>
      </span>
    </small>
  );
}