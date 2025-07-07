import { Post, Repost } from "../types";
import { startOfHour } from "date-fns";

export function createPostObject(data: any) {
  const postData: Post = (new Object() as Post);
  postData.user = data.userId;
  postData.postid = data.uuid;
  postData.embeds = data.embedContent;
  postData.label = data.contentLabel;
  postData.text = data.content;
  if (data.repostCount)
    postData.repostCount = data.repostCount;
  if (data.posted)
    postData.posted = data.posted;
  if (data.scheduledDate)
    postData.scheduledDate = data.scheduledDate;

  // ATProto data
  if (data.uri)
    postData.uri = data.uri;
  if (data.cid)
    postData.cid = data.cid;
  
  return postData;
}

export function createRepostObject(data: any) {
  const repostObj: Repost = (new Object() as Repost);
  repostObj.cid = data.cid;
  repostObj.uri = data.uri;
  repostObj.userId = data.userId;
  return repostObj;
};

export function floorCurrentTime() {
  return startOfHour(new Date());
}