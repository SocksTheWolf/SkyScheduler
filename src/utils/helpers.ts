import { startOfHour, subDays } from "date-fns";
import { Context } from "hono";
import has from "just-has";
import isEmpty from "just-is-empty";
import { BskyAPILoginCreds, Post, Repost, RepostInfo } from "../types";

export function createPostObject(data: any) {
  const postData: Post = (new Object() as Post);
  postData.user = data.userId;
  postData.postid = data.uuid;
  postData.embeds = data.embedContent;
  postData.label = data.contentLabel;
  postData.text = data.content;
  postData.postNow = data.postNow;
  postData.threadOrder = data.threadOrder;

  if (has(data, "repostCount"))
    postData.repostCount = data.repostCount;

  if (data.scheduledDate)
    postData.scheduledDate = data.scheduledDate;

  if (data.repostInfo)
    postData.repostInfo = data.repostInfo;

  if (data.rootPost)
    postData.rootPost = data.rootPost;

  if (data.parentPost) {
    postData.parentPost = data.parentPost;
    postData.isChildPost = true;
  } else {
    postData.isChildPost = false;
  }

  if (data.threadOrder == 0)
    postData.isThreadRoot = true;
  else
    postData.isThreadRoot = false;

  // ATProto data
  if (data.uri)
    postData.uri = data.uri;
  if (data.cid)
    postData.cid = data.cid;

  if (has(data, "isRepost"))
    postData.isRepost = data.isRepost;

  if (has(data, "posted"))
    postData.posted = data.posted;

  // if a cid flag appears for the object and it's a thread root, then the post (if marked not posted) is posted.
  if (postData.posted == false && !isEmpty(data.cid) && postData.isThreadRoot)
    postData.posted = true;

  return postData;
}

export function createRepostObject(data: any) {
  const repostObj: Repost = (new Object() as Repost);
  repostObj.postid = data.uuid;
  repostObj.cid = data.cid;
  repostObj.uri = data.uri;
  repostObj.userId = data.userId;
  if (data.scheduleGuid)
    repostObj.scheduleGuid = data.scheduleGuid;
  return repostObj;
}

export function createRepostInfo(id: string, time: Date, isRepost: boolean, repostData: any) {
  const repostObj: RepostInfo = (new Object() as RepostInfo);
  repostObj.time = time;
  repostObj.guid = id;
  if (has(repostData, "hours") && has(repostData, "times")) {
    repostObj.hours = repostData.hours;
    repostObj.count = repostData.times;
  } else {
    repostObj.count = (isRepost) ? 1 : 0;
    repostObj.hours = 0;
  }
  return repostObj;
}

export function createLoginCredsObj(data: any) {
  const loginCreds: BskyAPILoginCreds = (new Object() as BskyAPILoginCreds);
  if (isEmpty(data)) {
    loginCreds.password = loginCreds.username = loginCreds.pds = "";
  } else {
    loginCreds.pds = data.pds;
    loginCreds.username = data.user;
    loginCreds.password = data.pass;
  }
  loginCreds.valid = !isEmpty(data.user) && !isEmpty(data.pass);
  return loginCreds;
}

export function floorCurrentTime() {
  return startOfHour(new Date());
}

export function floorGivenTime(given: Date) {
  return startOfHour(given);
}

export function daysAgo(days: number) {
  return subDays(new Date(), days);
}

export function UseCFTurnstile(ctx: Context): boolean {
  return ctx.env.SIGNUP_SETTINGS.use_captcha && ctx.env.IN_DEV === false;
}