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

type BuildRuleFuncOutput = void|string;
type BuildRuleFunction = () => BuildRuleFuncOutput|Promise<BuildRuleFuncOutput>;

interface BuildRule {
  buildCommand: string|BuildRuleFunction;
  output?: string;
  minify?: boolean;
  captures?: CaptureType;
}

type CommandCallbackFunction = (data: string) => void;