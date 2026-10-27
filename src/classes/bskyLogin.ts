// This holds the 1:1 of an user's bluesky credentials from their settings
// these are incredibly ephemeral and only exist when the app is making a
// transaction on behalf of the user (making a post, reposting, etc).
//
// There is no way to access this object or its data outside of the transaction flow.
import isEmpty from "just-is-empty";
import type { DBServiceLogin } from "../types";

export class BskyAPILoginCreds {
  pds: string;
  username: string;
  password: string;
  did: string|null;
  constructor(data: DBServiceLogin | null) {
    if (isEmpty(data)) {
      this.did = null;
      this.password = this.username = this.pds = "";
    } else {
      this.pds = data!.pds;
      this.username = data!.user ?? "";
      this.password = data!.pass;
      this.did = data!.did;
    }
  }
  get valid(): boolean {
    return !isEmpty(this.username) && !isEmpty(this.password);
  }
}
