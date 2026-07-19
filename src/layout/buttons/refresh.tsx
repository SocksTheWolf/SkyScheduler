import type { BaseElementProps } from "../../types";

export default function RefreshPostsButton(props?: BaseElementProps) {
  return (<button id="refresh-posts" hx-get="/post/all" hx-target="#posts"
      hx-trigger="refreshPosts from:body throttle:3s, accountUpdated from:body, click throttle:10s, load once"
      hx-indicator="inherit, .refresh-icon">
    <span>Refresh Posts</span>
    <img class="refresh-icon" src="/icons/refresh.svg" height="20px" width="20px" alt="refresh icon" />
  </button>);
};