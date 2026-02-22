import isEmpty from "just-is-empty";

export class BskyAPILoginCreds {
  pds: string;
  username: string;
  password: string;
  valid: boolean;
  constructor(data: any) {
    if (isEmpty(data)) {
      this.password = this.username = this.pds = "";
    } else {
      this.pds = data.pds;
      this.username = data.user;
      this.password = data.pass;
    }
    this.valid = !isEmpty(data.user) && !isEmpty(data.pass);
  }
};
