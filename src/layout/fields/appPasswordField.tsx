import { BSKY_MAX_APP_PASSWORD_LENGTH } from "../../limits";

export type PasswordFieldSettings = {
  required?: boolean
}

// for bluesky app password fields
export default function BSkyAppPasswordField(props: PasswordFieldSettings) {
  return (<input type="password" name="bskyAppPassword" title="Bluesky account's App Password"
    maxlength={BSKY_MAX_APP_PASSWORD_LENGTH} placeholder="" required={props.required || undefined}
    data-1p-ignore data-bwignore data-lpignore="true"
    data-protonpass-ignore="true"
    autocomplete="off"></input>);
};
