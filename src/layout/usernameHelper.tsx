import { html } from "hono/html";
import { regexes } from "zod/v4";

export default function UsernameHelper() {
  return (
    <script type="text/javascript">
      {html`
        // Some simple code to make the username field clean up easily.
        const usrRegex=${regexes.domain};
        const username = document.getElementById("username");
        username.addEventListener("change", function(ev) {
          if (!username.value.match(usrRegex)) {
            const newName = username.value + ".bsky.social";
            // If this matches a domain, then update the field to the new name
            if (newName.match(usrRegex))
              username.value = newName;
          }
        });
      `}
    </script>
  )
}
