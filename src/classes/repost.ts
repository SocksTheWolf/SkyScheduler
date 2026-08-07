import type { RepostIntakeData } from "../types";
import { has } from "../utils/helpers";

type DBRepost = {
  postid?: never;
  uuid: string;
  uri: string|null;
  cid: string|null;
  userId: string;
  scheduleGuid?: string|null;
  content?: string|null;
}

type RawRepost = Repost & {
  uuid: never;
}

export type RepostIntakeType = RawRepost|DBRepost;

export class Repost {
  postid: string;
  uri: string;
  cid: string;
  userId: string;
  scheduleGuid?: string;
  content?: string;
  constructor(data: RepostIntakeType) {
    if (has(data, "uuid"))
      this.postid = data.uuid;
    else
      this.postid = data.postid ?? "";

    this.cid = data.cid ?? "";
    this.uri = data.uri ?? "";
    this.userId = data.userId;

    if (has(data, "content"))
      this.content = data.content!;

    if (has(data, "scheduleGuid"))
      this.scheduleGuid = data.scheduleGuid!;
  }
  getUser(): string {
    return this.userId;
  }
};

// Contains the repost info for a post
export class RepostInfo {
  guid: string;
  time: Date|string;
  hours: number;
  count: number;
  constructor(id: string, time: string|Date, isRepost: boolean, repostData: RepostIntakeData) {
    this.time = time;
    this.guid = id;
    if (has(repostData, "hours") && has(repostData, "times")) {
      this.hours = repostData!.hours;
      this.count = repostData!.times;
    } else {
      this.count = (isRepost) ? 1 : 0;
      this.hours = 0;
    }
  }
};
