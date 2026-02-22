import { APP_NAME } from "../../siteinfo";
import { LogoImage } from "./logo";

export default function NavTags() {
  return (
    <header>
      <div class="container navHeader">
        <div>
          <a href="/" title={`${APP_NAME} homepage`}>
            <LogoImage />
            <h2 class="secondary">{APP_NAME}</h2>
          </a>
        </div>
        <div style="flex-grow: 1"></div>
        <nav>
          <ul>
            <li><a href="/signup">Sign Up</a></li>
            <li><a href="/login"><button class="secondary">Login</button></a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}