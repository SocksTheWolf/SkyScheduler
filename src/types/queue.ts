import { Repost } from "../classes/repost";
import { Post } from "../classes/post";

export enum TaskType {
  None,
  Post,
  Repost
};

export type QueueTaskData = {
  type: TaskType;
  post?: Post;
  repost?: Repost;
};
