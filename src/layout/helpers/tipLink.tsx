import isEmpty from "just-is-empty";
import { APP_NAME, SERVICE_TIP_URL } from "../../appInfo";

interface TipLinkProps {
  text?: string;
  removeExcessTab?: boolean;
  postText?: string;
}

export function TipLink(props: TipLinkProps) {
  if (isEmpty(SERVICE_TIP_URL)) {
    return null;
  }

  return (<><a class="tipLink secondary" target="_blank" tabindex={props.removeExcessTab ? -1 : 0}
      data-tooltip="Tips are not required as the service is free, but if this helps you, a tip would be appreciated <3"
      title={`Tip the dev, mention ${APP_NAME} on any donations`} href="/tip">{props.text ?? "Tip"}</a>{props.postText}</>);
}