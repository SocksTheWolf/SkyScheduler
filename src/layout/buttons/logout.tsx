
export default function LogoutButton() {
  return (<div>
    <button class="outline w-full btn-error logout" hx-post="/account/logout"
      hx-target="body" hx-confirm="Are you sure you want to logout?">
      Logout
    </button>
  </div>);
};