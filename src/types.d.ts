// Easy type declares for typescript type checking
// not used otherwise
declare type LooseObj = {
  [key: string]: any;
};
declare type BatchQuery = [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]];
declare type AllContext = Context | ScheduledContext;