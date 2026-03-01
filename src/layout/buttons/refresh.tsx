
export default function RefreshPostsButton() {
  return (<>
    <button id="refresh-posts" hx-get="/post/all" hx-target="#posts"
        hx-trigger="refreshPosts from:body, accountUpdated from:body, click throttle:3s"
        hx-on-htmx-before-request="this.classList.add('svgAnim');"
        hx-on-htmx-after-request="setTimeout(() => {this.classList.remove('svgAnim')}, 3000)">
      <span>Refresh Posts</span>
      <img src="/icons/refresh.svg" height="20px" width="20px" alt="refresh icon" />
    </button>
  </>);
};