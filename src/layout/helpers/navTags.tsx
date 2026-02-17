import { APP_NAME } from "../../limits";

export default function NavTags() {
  return (
    <div class="container">
      <nav>
        <ul>
          <li><h2><a class="contrast" href="/">{APP_NAME}</a></h2></li>
        </ul>
        <ul>
          <li><a href="/signup">Sign Up</a></li>
          <li><a href="/login"><button class="secondary">Login</button></a></li>
        </ul>
      </nav>
    </div>
  );
}