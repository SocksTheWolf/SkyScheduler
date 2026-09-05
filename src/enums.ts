export enum EmbedDataType {
  None = 0,
  Image = 1,
  WebLink = 2,
  Video = 3,
  Record = 4,
}

export enum RepostType {
  None = 0,
  ExistingPost = 1,
  FuturePost = 2,
}

export enum PostLabel {
  None = "None",
  Suggestive = "Suggestive",
  Nudity = "Nudity",
  Adult = "Adult",
  Graphic = "Graphic",
  GraphicAdult = "GraphicAdult",
}

export enum TaskType {
  None,
  Blast,
  Post,
  Repost,
}

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
  TOSViolation,
}

export enum PWAutoCompleteSettings {
  Off,
  NewPass,
  CurrentPass,
}

export enum ImageResizeResult {
  None,
  Success,
  TooLarge,
  ExhaustedResources,
}

// What a time object is contextually used for.
export enum TimeShape {
  Post,
  Repost,
}

export enum TimeIntervalSettings {
  Hour = 60,
  HalfHour = 30,
  QuarterHour = 15,
  TenMinutes = 10,
  FiveMinutes = 5,
}

export enum ScriptInclusionLevel {
  NonInteractive,
  Interactive,
  DashboardApp,
}

// used for lint building
export enum CaptureType {
  CONSTS,
  FUNCS
}

export enum DateValidCheck {
  IsPastDate,
  TooFutureDate,
  Ok
}
