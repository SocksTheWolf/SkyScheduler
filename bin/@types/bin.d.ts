interface BuildTrigger {
  name: string;
  match: string[];
  ignores?: string[];
  against: string;
  triggers: string[];
}

interface SitemapPageInfo {
  url: string;
  lastMod: string;
}

type BuildRuleFuncOutput = undefined|string;
type BuildRuleFuncPromise = Promise<undefined>;
type BuildRuleFunction = () => BuildRuleFuncOutput|Promise<BuildRuleFuncOutput>;

interface BuildRule {
  buildCommand: string|BuildRuleFunction;
  output?: string;
  minify?: boolean;
  captures?: CaptureType;
  isTypeAction?: boolean;
};

interface BuildCmds {
  actions: string[];
};

type BuildRules = Map<string, BuildRule>;
type BuildCommands = Map<string, BuildCmds>;

interface BuildRunnerOptions {
  rules: BuildRules,
  triggers: BuildTrigger[],
  commands?: BuildCommands
};

type CommandCallbackFunction = (data: string) => Promise<void>;