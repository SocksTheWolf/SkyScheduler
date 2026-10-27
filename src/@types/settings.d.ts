// interfaces that define wrangler settings object structures
// as well as app info settings

interface AgentConfigSettings {
  use_posts: boolean;
  use_reposts: boolean;
}

interface AppHostnameConfig {
  hostnames: string[],
  main: string,
  csp?: string
}
