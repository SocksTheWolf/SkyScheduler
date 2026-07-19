import type { BaseElementProps } from "../../types";

type PDSInputFieldProps = BaseElementProps & {
  pds?: string;
  swap: boolean;
};

// only used in settings and in /account/pds to give the user a more customized experience
// this also allows us to SSG the dashboard if we want to.
export default function PDSInputField(props: PDSInputFieldProps) {
  const pdsValue = props.pds || "";
  return (<input id="pdsField" hx-swap-oob={props.swap ? "outerHTML" : undefined} type="text" name="bskyUserPDS" placeholder={pdsValue} />);
}