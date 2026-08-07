import { APP_NAME, LOGO_ENABLED } from "../../appInfo";

interface LogoImageProps {
  width: number;
  height: number;
}

export default function LogoImage(props: LogoImageProps) {
  if (!LOGO_ENABLED)
    return null;

  const width: number = props.width || 32;
  const height: number = props.height || 32;

  return (<>
    <img src="/logo.svg" fetchpriority="high" alt={`${APP_NAME} logo`} width={`${width}px`} height={`${height}px`} />
  </>);
}