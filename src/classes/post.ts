import isEmpty from "just-is-empty";
import type { PostLabel } from "../enums";
import { CAN_REPOST_SCHEDULED_POSTS, MAX_REPOST_RULES_PER_POST } from "../limits";
import type { BaseContent, EmbedData } from "../types";
import { has } from "../utils/helpers";
import type { RepostInfo } from "./repost";

// This is a real copy of the schema
interface DBPost {
  uuid: string;
  content: string;
  embedContent?: EmbedData[],
  contentLabel: PostLabel;
  userId: string;
  cid?: string|null;
  uri?: string|null;
  scheduledDate?: Date|string;
  postNow: boolean|null;
  threadOrder: number|null;
  repostInfo: RepostInfo[]|null,
  isRepost: boolean|null;
  posted: boolean|null;
  rootPost: string|null;
  parentPost: string|null;
  repostCount?: number|null;
}

export type PostIntakeType = Post|DBPost;

// Basically a copy of the schema
export class Post implements BaseContent {
  // guid for post
  uuid: string;
  // SkyScheduler User Id
  userId: string;
  // post data
  content: string;
  embedContent?: EmbedData[];
  contentLabel: PostLabel;
  // post flags
  postNow: boolean;
  posted?: boolean;
  isRepost?: boolean;
  // repost metadata
  repostInfo?: RepostInfo[];
  scheduledDate?: string;
  repostCount?: number;
  // atproto data
  cid: string;
  uri: string;
  // thread data
  threadOrder: number;
  rootPost?: string;
  parentPost?: string;

  constructor(data: PostIntakeType) {
    this.userId = data.userId;
    this.uuid = data.uuid;
    this.embedContent = data.embedContent;

    this.contentLabel = data.contentLabel;
    this.content = data.content;
    this.postNow = data.postNow ?? false;
    this.threadOrder = data.threadOrder ?? -1;

    if (has(data, "repostCount"))
      this.repostCount = data.repostCount!;

    if (has(data, "scheduledDate"))
      this.scheduledDate = data.scheduledDate instanceof Date ? data.scheduledDate.toISOString() : data.scheduledDate;

    if (has(data, "repostInfo"))
      this.repostInfo = data.repostInfo!;

    if (has(data, "rootPost"))
      this.rootPost = data.rootPost!;

    if (has(data, "parentPost"))
      this.parentPost = data.parentPost!;

    // ATProto data
    this.uri = data.uri ?? "";
    this.cid = data.cid ?? "";

    if (has(data, "isRepost"))
      this.isRepost = data.isRepost!;

    if (has(data, "posted"))
      this.posted = data.posted!;

    // if a cid flag appears for the object and it's a thread root, then the post (if marked not posted) is posted.
    if (this.posted == false && !isEmpty(data.cid) && this.isThreadRoot)
      this.posted = true;
  }
  getURI(): string|null {
    return this.uri ? "https://bsky.app/profile/" + this.uri.replace("at://","").replace("app.bsky.feed.","") : null;
  }
  getUser(): string {
    return this.userId;
  }
  canAddMoreRepostRules(): boolean {
    if (!this.posted && !CAN_REPOST_SCHEDULED_POSTS)
      return false;

    return !this.isChildPost && (this.repostInfo === undefined || this.repostInfo.length < MAX_REPOST_RULES_PER_POST);
  }
  hasEmbeds(): boolean {
    return this.embedContent !== undefined && this.embedContent.length > 0;
  }
  get isThread() { return this.threadOrder >= 0; }
  get isThreadRoot() { return this.threadOrder == 0; }
  get isChildPost() { return this.parentPost !== undefined; }
  get isPosted() { return this.posted ?? false; }
  get isARepost() { return this.isRepost ?? false; }
};
