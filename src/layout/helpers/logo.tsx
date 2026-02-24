import { APP_NAME, LOGO_ENABLED } from "../../siteinfo";

type LogoImageProps = {
  enabled?: boolean;
  width: number;
  height: number;
};

export function LogoImage(props: LogoImageProps) {
  if (LOGO_ENABLED == false)
    return null;

  let width: number = props.width || 32;
  let height: number = props.height || 32;

  return (<>
    <img src="/logo.svg" fetchpriority="high" alt={`${APP_NAME} logo`} width={`${width}px`} height={`${height}px`} />
  </>);
}