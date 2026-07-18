import { raw } from "hono/html";
import type { PreloadRules } from "../../types";

type NoncePropType = {
  nonce?: string
};

type DepTagsType = NoncePropType & {
  scripts?: PreloadRules[]
};

// generate css/js tags for the given dependencies
export function IncludeDependencyTags({scripts, nonce}: DepTagsType) {
  if (scripts === undefined) {
    return null;
  }

  const html = scripts.map((itm) => {
    switch (itm.type) {
      case "script":
        return (<script type="text/javascript" src={itm.href} nonce={nonce}></script>);
      case "module":
        return (<script type="module" src={itm.href} nonce={nonce}></script>);
      case "style":
        return (<link href={itm.href} rel="stylesheet" type="text/css" nonce={nonce} />);
    }
  });
  return (<>{html}</>);
};

export function PreloadDependencyTags({scripts}: DepTagsType) {
  if (scripts === undefined) {
    return null;
  }

  const html = scripts.map((itm) => {
    return (<link rel="preload" href={itm.href} as={itm.type} />);
  });
  return (<>{html}</>);
};

export function HTMXNonceTag({nonce}: NoncePropType) {
  return raw(`<meta name="htmx-config" content='{"allowEval":false,"inlineScriptNonce":"${nonce}","inlineStyleNonce":"${nonce}"}' />`);
}
