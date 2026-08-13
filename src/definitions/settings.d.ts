// interfaces that define wrangler settings object structures

interface ImageConfigSettings {
  enabled: boolean;
  steps?: number[];
  bucket_url?: string;
}

interface R2ConfigSettings {
  auto_prune: boolean;
  prune_days?: number;
}

interface QueueConfigSettings {
  enabled: boolean;
  repostsEnabled: boolean;
  threadEnabled: boolean;
  postNowEnabled?: boolean;
  pressure_retries?: boolean;
  delay_val: number;
  max_retries: number;
  post_queues: string[];
  repost_queues: string[];
}

interface AgentConfigSettings {
  use_posts: boolean;
  use_reposts: boolean;
}
