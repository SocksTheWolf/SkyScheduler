import has from "just-has";
import isEmpty from "just-is-empty";
import { EmbedData, PostLabel } from "../types";
import { RepostInfo } from "./repost";
import { MAX_REPOST_RULES_PER_POST } from "../limits";

// Basically a copy of the schema
export class Post {
  // guid for post
  postid: string;
  // SkyScheduler User Id
  user: string;
  // post data
  text: string;
  embeds?: EmbedData[];
  label: PostLabel;
  // post flags
  postNow: boolean;
  posted?: boolean;
  isRepost?: boolean;
  // repost metadata
  repostInfo?: RepostInfo[];
  scheduledDate?: string;
  repostCount?: number;
  // atproto data
  cid?: string;
  uri?: string;
  // thread data
  threadOrder: number;
  rootPost?: string;
  parentPost?: string;

  constructor(data: any) {
    if (has(data, "userId"))
      this.user = data.userId;
    else
      this.user = data.user;

    if (has(data, "uuid"))
      this.postid = data.uuid;
    else
      this.postid = data.postid;

    if (has(data, "embedContent"))
      this.embeds = data.embedContent;
    else if (has(data, "embeds"))
      this.embeds = data.embeds;

    if (has(data, "contentLabel"))
      this.label = data.contentLabel;
    else
      this.label = data.label;

    if (has(data, "content"))
      this.text = data.content;
    else
      this.text = data.text;

    this.postNow = data.postNow;
    this.threadOrder = data.threadOrder;

    if (has(data, "repostCount"))
      this.repostCount = data.repostCount;

    if (data.scheduledDate)
      this.scheduledDate = data.scheduledDate;

    if (data.repostInfo)
      this.repostInfo = data.repostInfo;

    if (data.rootPost)
      this.rootPost = data.rootPost;

    if (data.parentPost)
      this.parentPost = data.parentPost;

    // ATProto data
    if (data.uri)
      this.uri = data.uri;
    if (data.cid)
      this.cid = data.cid;

    if (has(data, "isRepost"))
      this.isRepost = data.isRepost;

    if (has(data, "posted"))
      this.posted = data.posted;

    // if a cid flag appears for the object and it's a thread root, then the post (if marked not posted) is posted.
    if (this.posted == false && !isEmpty(data.cid) && this.isThreadRoot)
      this.posted = true;
  }
  getURI(): string|null {
    return this.uri ? "https://bsky.app/profile/" + this.uri.replace("at://","").replace("app.bsky.feed.","") : null;
  }
  getUser(): string {
    return this.user;
  }
  canAddMoreRepostRules(): boolean {
    /*if (!this.posted)
      return false;*/

    return !this.isChildPost && (this.repostInfo === undefined || this.repostInfo.length < MAX_REPOST_RULES_PER_POST);
  }
  hasEmbeds(): boolean {
    return this.embeds !== undefined && this.embeds.length > 0;
  }
  get isThreadRoot() { return this.threadOrder == 0; }
  get isChildPost() { return this.parentPost !== undefined; }
};
