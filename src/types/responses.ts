import { EmbedData } from "./posts";

export type PostResponseObject = {
  uri: string;
  cid: string;
};

export type PostRecordResponse = PostResponseObject & {
  postID: string | null;
  content: string;
  embeds?: EmbedData[];
};

export type PostStatus = {
  records: PostRecordResponse[];
  // number of expected successes
  expected: number;
  // number of successes we got
  got: number;
};

export type DeleteResponse = {
  success: boolean;
  needsRefresh?: boolean;
};

export type CreateObjectResponse = {
  ok: boolean;
  msg: string;
  postId?: string;
};

export type CreatePostQueryResponse = CreateObjectResponse & {
  postNow?: boolean;
};
