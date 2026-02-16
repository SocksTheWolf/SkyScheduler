import { PreloadRules } from "../types.d";

type DepTagsType = {
  scripts?: PreloadRules[]
};

type ScriptTagsType = {
  scripts: string[];
}

export function DependencyTags({scripts}: DepTagsType) {
  if (scripts === undefined) {
    return (<></>);
  }

  const html = scripts.map((itm) => {
    switch (itm.type) {
      case "script":
        return (<script type="text/javascript" src={itm.href}></script>);
      case "style":
        return (<link href={itm.href} rel="stylesheet" type="text/css" />);
    }
  });
  return (<>{html}</>);
}

export function ScriptTags({scripts}: ScriptTagsType) {
  const html = scripts.map((itm) => {
    return (<script type="text/javascript" src={itm}></script>);
  });
  return (<>{html}</>);
}

export function PreloadDependencyTags({scripts}: DepTagsType) {
  if (scripts === undefined) {
    return (<></>);
  }

  const html = scripts.map((itm) => {
    return (<link rel="preload" href={itm.href} as={itm.type} />);
  });
  return (<>{html}</>);
}