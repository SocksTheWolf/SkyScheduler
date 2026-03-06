import { APP_NAME } from "../../siteinfo";
import LogoImage from "./logo";

export default function NavTags() {
  return (
    <header>
      <div class="container navHeader">
        <div>
          <a href="/" title={`${APP_NAME} homepage`}>
            <LogoImage width={64} height={64} />
            <h2 class="appTitle">{APP_NAME}</h2>
          </a>
        </div>
        <div style="flex-grow: 1"></div>
        <nav>
          <ul>
            <li><a role="button" href="/signup">Sign Up</a></li>
            <li><a role="button" class="login secondary" href="/login">Login</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}