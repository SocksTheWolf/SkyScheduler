interface BuildTrigger {
  name: string;
  match: string[];
  against: string;
  triggersRules: string[];
}

type BuildRuleFuncOutput = void|string;
type BuildRuleFunction = () => BuildRuleFuncOutput|Promise<BuildRuleFuncOutput>;

interface BuildRule {
  buildCommand: string|BuildRuleFunction;
  output?: string;
  minify?: boolean;
  captures?: CaptureType;
};

type CommandCallbackFunction = (data: string) => void;

interface MoveMapRule {
  file: string;
  destFolder: string;
}