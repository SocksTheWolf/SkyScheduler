// Helper footer for various pages
export default function FooterCopyright() {
  return (
    <small> 
      <a class="secondary" target="_blank" href="https://github.com/SocksTheWolf/SkyScheduler">SkyScheduler</a> &copy; {new Date().getFullYear()} 
      <span class="credits"><a rel="author" href="https://socksthewolf.com">SocksTheWolf</a> -
      <a class="secondary" target="_blank" href="https://ko-fi.com/socksthewolf">Tip</a></span>
    </small>
  );
}