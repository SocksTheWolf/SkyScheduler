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

export type Violation = {
  userId: string;
  tosViolation: boolean;
  userPassInvalid: boolean;
  accountSuspended: boolean;
  accountGone: boolean;
  mediaTooBig: boolean;
  createdAt: string;
};

