// handling preloading and injection of dependencies into the layout
import type { BaseElementProps } from "../../types";

export type PreloadRules = {
  type: string;
  href: string;
};

type DepTagsType = BaseElementProps & {
  scripts?: PreloadRules[]
};

// generate css/js tags for the given dependencies
export function IncludeDependencyTags(props: DepTagsType) {
  const scripts = props.scripts;
  if (scripts === undefined) {
    return null;
  }

  const nonce: string|undefined = props.ctx?.get("secureHeadersNonce");
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
}

export function PreloadDependencyTags({scripts}: DepTagsType) {
  if (scripts === undefined) {
    return null;
  }

  const html = scripts.map((itm) => {
    return (<link rel="preload" href={itm.href} as={itm.type} />);
  });
  return (<>{html}</>);
}