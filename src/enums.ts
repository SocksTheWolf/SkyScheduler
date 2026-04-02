
export enum EmbedDataType {
  None = 0,
  Image = 1,
  WebLink = 2,
  Video = 3,
  Record = 4
};

export enum RepostType {
  None = 0,
  ExistingPost = 1,
  FuturePost = 2
};

export enum PostLabel {
  None = "None",
  Suggestive = "Suggestive",
  Nudity = "Nudity",
  Adult = "Adult",
  Graphic = "Graphic",
  GraphicAdult = "GraphicAdult"
};

export enum TaskType {
  None,
  Blast,
  Post,
  Repost,
  VideoPost
};

export enum AccountStatus {
  None = 0,
  Ok,
  Suspended,
  Deactivated,
  TakenDown,
  InvalidAccount,
  PlatformOutage,
  MediaTooBig,
  UnhandledError,
  TOSViolation
};

export enum PWAutoCompleteSettings {
  Off,
  NewPass,
  CurrentPass
};
