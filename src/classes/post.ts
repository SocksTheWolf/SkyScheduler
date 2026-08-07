import type { BlobRef } from "@atproto/api";
import isEmpty from "just-is-empty";
import type { PostLabel } from "../enums";
import { CAN_REPOST_SCHEDULED_POSTS, MAX_REPOST_RULES_PER_POST } from "../limits";
import type { EmbedData } from "../types";
import { has } from "../utils/helpers";
import type { RepostInfo } from "./repost";

// This is a real copy of the schema
type DBPost = {
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

  user?: never;
  postid?: never;
  text?: never;
  embeds?: never;
  label?: never;
}

// And this is just Post type
// which really should just have copied the schema actually
// but we can fix it in the future
// TODO: Clean up Post type
type RawPost = Post & {
  postid: string;
  text: string;
  embeds?: EmbedData[];
  label: PostLabel;
  user: string;

  userId: never;
  embedContent: never;
  contentLabel: never;
  content: never;
  uuid: never;
}

export type PostIntakeType = RawPost|DBPost;

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
  // blob override data
  blobOverride?: null|BlobRef;

  constructor(data: PostIntakeType) {
    if (has(data, "userId"))
      this.user = data.userId;
    else
      this.user = data.user!;

    if (has(data, "uuid"))
      this.postid = data.uuid;
    else
      this.postid = data.postid!;

    if (has(data, "embedContent"))
      this.embeds = data.embedContent;
    else if (has(data, "embeds"))
      this.embeds = data.embeds;

    if (has(data, "contentLabel"))
      this.label = data.contentLabel;
    else
      this.label = data.label!;

    if (has(data, "content"))
      this.text = data.content;
    else
      this.text = data.text!;

    this.postNow = data.postNow ?? false;
    this.threadOrder = data.threadOrder ?? -1;

    if (has(data, "repostCount"))
      this.repostCount = data.repostCount!;

    if (has(data, "scheduledDate"))
      this.scheduledDate = data.scheduledDate instanceof Date ? data.scheduledDate.toISOString() : data.scheduledDate;

    if (data.repostInfo)
      this.repostInfo = data.repostInfo;

    if (data.rootPost)
      this.rootPost = data.rootPost;

    if (has(data, "parentPost"))
      this.parentPost = data.parentPost!;

    // ATProto data
    if (data.uri)
      this.uri = data.uri;
    if (data.cid)
      this.cid = data.cid;

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
    return this.user;
  }
  canAddMoreRepostRules(): boolean {
    if (!this.posted && !CAN_REPOST_SCHEDULED_POSTS)
      return false;

    return !this.isChildPost && (this.repostInfo === undefined || this.repostInfo.length < MAX_REPOST_RULES_PER_POST);
  }
  hasEmbeds(): boolean {
    return this.embeds !== undefined && this.embeds.length > 0;
  }
  get isThreadRoot() { return this.threadOrder == 0; }
  get isChildPost() { return this.parentPost !== undefined; }
  get isPosted() { return this.posted ?? false; }
  get isARepost() { return this.isRepost ?? false; }
};
