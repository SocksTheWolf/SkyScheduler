import { Post } from "../types";

export function createPostObject(data: any) {
    const postData: Post = (new Object() as Post);
    postData.user = data.userId;
    postData.postid = data.uuid;
    postData.embeds = data.embedContent;
    postData.label = data.contentLabel;
    postData.text = data.content;
    return postData;
}
