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
  None = "None",
  Suggestive = "Suggestive",
  Nudity = "Nudity",
  Adult = "Adult",
  Graphic = "Graphic"
};

export type Post = {
  text: string;
  embeds?: EmbedData[];
  label: PostLabel;
};