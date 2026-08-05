import { raw } from "hono/html";
import type { LooseObj, PreloadRules } from "../../types";

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
        return (<script type="text/javascript" src={itm.href} nonce={nonce} async={itm.async || undefined} defer={itm.defer||undefined}></script>);
      case "module":
        return (<script type="module" src={itm.href} nonce={nonce} async={itm.async || undefined} defer={itm.defer||undefined}></script>);
      case "style":
        return (<link href={itm.href} rel="stylesheet" type="text/css" nonce={nonce} />);
      default:
        return (<></>);
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

export function getHTMXConfigStr(nonce: string|undefined) {
  const HTMXConfigObj: LooseObj = {
    responseHandling: [
      {code:"204", swap:false},
      {code:"400", swap:false, error:true},
      {code:"404", swap:true, error:true},
      {code:"[234]..", swap:true, error:false},
      {code:"500", swap:true, error:true},
      {code:"[5]..", swap:false, error:true},
      {code:"...", swap:true}
    ]
  };
  if (nonce !== undefined) {
    HTMXConfigObj.allowEval = false;
    HTMXConfigObj.inlineScriptNonce = HTMXConfigObj.inlineStyleNonce = nonce;
  }

  return `<meta name="htmx-config" content='${JSON.stringify(HTMXConfigObj)}' />`;
};

export function HTMXNonceTag({nonce}: NoncePropType) {
  return raw(getHTMXConfigStr(nonce));
};
