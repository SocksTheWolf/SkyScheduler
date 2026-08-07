import isEmpty from "just-is-empty";
import type { DBServiceLogin } from "../types";

export class BskyAPILoginCreds {
  pds: string;
  username: string;
  password: string;
  constructor(data: DBServiceLogin|null) {
    if (isEmpty(data)) {
      this.password = this.username = this.pds = "";
    } else {
      this.pds = data!.pds;
      this.username = data!.user ?? "";
      this.password = data!.pass;
    }
  }
  get valid(): boolean {
    return !isEmpty(this.username) && !isEmpty(this.password);
  }
};
