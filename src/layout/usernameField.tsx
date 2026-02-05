import { raw } from "hono/html";
import { BSKY_MIN_USERNAME_LENGTH } from "../limits";

type UsernameFieldProps = {
  title?: string;
  hintText?: string;
  required?: boolean;
};

export function UsernameField(props?: UsernameFieldProps) {
  const hintText = props?.hintText ? raw(props.hintText) :
     (<span>This is your Bluesky username/handle, in the format of a custom domain or <code>USERNAME.bsky.social</code>.
     <br />Profile/post links will attempt to be converted to the correct format.
     </span>);
  // default required true.
  const inputRequired = (props) ? (props?.required || false) : true;
  return (
    <label>
      {props?.title || "Bluesky Handle"}
      <input type="text" id="username" name="username" autocomplete="username" minlength={BSKY_MIN_USERNAME_LENGTH} required={inputRequired} />
      <small>{hintText}</small>
    </label>
  );
}