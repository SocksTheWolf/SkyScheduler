import { APP_NAME } from "../../siteinfo";
import LogoImage from "./logo";
import type { BaseElementProps } from "../../types";

export default function NavTags(props?: BaseElementProps) {
  return (
    <header>
      <div class="container navHeader">
        <div>
          <a href="/" title={`${APP_NAME} homepage`}>
            <LogoImage width={64} height={64} />
            <h2 class="appTitle">{APP_NAME}</h2>
          </a>
        </div>
        <div class="nav-flex-space"></div>
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