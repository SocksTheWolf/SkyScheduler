import { Post, Repost } from "../types";

export function createPostObject(data: any) {
  const postData: Post = (new Object() as Post);
  postData.user = data.userId;
  postData.postid = data.uuid;
  postData.embeds = data.embedContent;
  postData.label = data.contentLabel;
  postData.text = data.content;
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
  const currentTime = new Date();
  // round current time to nearest hour
  currentTime.setMinutes(0, 0, 0);
  return currentTime;
}