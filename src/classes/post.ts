import has from "just-has";
import { EmbedData, PostLabel } from "../types/posts";
import { RepostInfo } from "./repost";
import isEmpty from "just-is-empty";

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
  isThreadRoot: boolean;
  isChildPost: boolean;
  threadOrder: number;
  rootPost?: string;
  parentPost?: string;

  constructor(data: any) {
    this.user = data.userId;
    this.postid = data.uuid;
    this.embeds = data.embedContent;
    this.label = data.contentLabel;
    this.text = data.content;
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

    if (data.parentPost) {
      this.parentPost = data.parentPost;
      this.isChildPost = true;
    } else {
      this.isChildPost = false;
    }

    if (data.threadOrder == 0)
      this.isThreadRoot = true;
    else
      this.isThreadRoot = false;

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
};
