// handling preloading and injection of dependencies into the layout

export type PreloadRules = {
  type: string;
  href: string;
};

type DepTagsType = {
  scripts?: PreloadRules[]
};

// generate css/js tags for the given dependencies
export function IncludeDependencyTags({scripts}: DepTagsType) {
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

export function PreloadDependencyTags({scripts}: DepTagsType) {
  if (scripts === undefined) {
    return (<></>);
  }

  const html = scripts.map((itm) => {
    return (<link rel="preload" href={itm.href} as={itm.type} />);
  });
  return (<>{html}</>);
}