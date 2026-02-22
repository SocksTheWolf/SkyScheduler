import has from "just-has";

export class Repost {
  postid: string;
  uri: string;
  cid: string;
  userId: string;
  scheduleGuid?: string;
  constructor(data: any) {
    this.postid = data.uuid;
    this.cid = data.cid;
    this.uri = data.uri;
    this.userId = data.userId;
    if (data.scheduleGuid)
      this.scheduleGuid = data.scheduleGuid;
  }
};

// Contains the repost info for a post
export class RepostInfo {
  guid: string;
  time: Date;
  hours: number;
  count: number;
  constructor(id: string, time: Date, isRepost: boolean, repostData: any) {
    this.time = time;
    this.guid = id;
    if (has(repostData, "hours") && has(repostData, "times")) {
      this.hours = repostData.hours;
      this.count = repostData.times;
    } else {
      this.count = (isRepost) ? 1 : 0;
      this.hours = 0;
    }
  }
};

