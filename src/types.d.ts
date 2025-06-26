export type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
  IMAGES: Images;
  JWT_SECRET: string;
  AUTH_PASSWORD: string;
  BSKY_USERNAME: string;
  BSKY_PASSWORD: string;
  USE_IMAGE_TRANSFORMS: boolean;
  MAX_IMAGE_QUALITY_STEPS: number;
  IMAGE_DEGRADE_PER_STEP: number;
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