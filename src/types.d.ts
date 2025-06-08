export type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
  JWT_SECRET: string;
  AUTH_PASSWORD: string;
  BSKY_USERNAME: string;
  BSKY_PASSWORD: string;
};

export type EmbedData = {
  content: string;
  alt: string;
};

export enum PostLabel {
  None = 0,
  Suggestive,
  Nudity,
  Adult,
  Graphic
};

export type Post = {
  text: string;
  embeds?: EmbedData[];
  label: PostLabel = PostLabel.None;
};