import { html, raw } from "hono/html";
import { regexes } from "zod/v4";
import { BSKY_MIN_USERNAME_LENGTH } from "../limits.d";

type UsernameFieldProps = {
  title?: string;
  hintText?: string;
  required?: boolean;
};

export default function UsernameField(props?: UsernameFieldProps) {
  const hintText = props?.hintText ? raw(props.hintText) : raw("This is your Bluesky username, in the format of a custom domain or like <code>USERNAME.bsky.social</code>.");
  // default required true.
  const inputRequired = (props) ? (props?.required || false) : true;
  return (
    <label>
      {props?.title || "Bluesky Handle"}
      <input type="text" id="username" name="username" autocomplete="username" minlength={BSKY_MIN_USERNAME_LENGTH} required={inputRequired} />
      <small>{hintText}</small>
      <script type="text/javascript">
      {html`
        // Some simple code to make the username field clean up easily.
        if (username = document.getElementById("username")) {
          const usrRegex=${regexes.domain};
          username.addEventListener("change", function(ev) {
            if (!username.value.match(usrRegex)) {
              const newName = username.value + ".bsky.social";
              // If this matches a domain, then update the field to the new name
              if (newName.match(usrRegex))
                username.value = newName;
            }
          });
        }
      `}
      </script>
    </label>
  );
}