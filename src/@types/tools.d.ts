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

type BuildRules = Map<string, BuildRule>;
type BuildTriggers = BuildTrigger[];

type CommandCallbackFunction = (data: string) => Promise<void>;