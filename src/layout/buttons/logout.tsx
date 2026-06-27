import type { BaseElementProps } from "../../types";

export default function LogoutButton(props?: BaseElementProps) {
  return (<div>
    <button class="outline w-full btn-error logout" hx-post="/account/logout"
      hx-target="body" hx-confirm="Are you sure you want to logout?">
      Logout
    </button>
  </div>);
};