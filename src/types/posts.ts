export enum EmbedDataType {
  None = 0,
  Image = 1,
  WebLink = 2,
  Video = 3,
  Record = 4
};

export type EmbedData = {
  content: string;
  alt?: string;
  title?: string;
  uri?: string;
  type: EmbedDataType;
  description?: string;
  width?: number;
  height?: number;
  duration?: number;
};

export enum PostLabel {
  None = "None",
  Suggestive = "Suggestive",
  Nudity = "Nudity",
  Adult = "Adult",
  Graphic = "Graphic",
  GraphicAdult = "GraphicAdult"
};
