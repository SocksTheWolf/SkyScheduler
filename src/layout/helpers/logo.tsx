import { APP_NAME } from "../../siteinfo";

export function LogoImage() {
  if (true)
    return null;

  // we can put on some more flags later to do things with like svg shenanigans
  return (<>
    <img src="/logo.png" alt={`${APP_NAME} logo`} width="64px" height="64px" />
  </>);
}