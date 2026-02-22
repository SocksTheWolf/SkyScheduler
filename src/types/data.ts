// Used for the pruning and database operations
export type GetAllPostedBatch = {
  id: string;
  uri: string|null;
};

export type R2BucketObject = {
  name: string;
  user: string|null;
  date: Date
};