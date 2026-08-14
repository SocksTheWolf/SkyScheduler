import isEmpty from "just-is-empty";
import { BSKY_ACCOUNT_LINK, SERVICE_TIP_URL, SOURCE_URL } from "../appInfo";

interface RedirectRule {
  path: string;
  destination: string;
}

export const redirectRules = (): string => {
  const rules: RedirectRule[] = [
    {path: "/terms", destination: "/tos"},
    {path: "/bsky", destination: BSKY_ACCOUNT_LINK},
    {path: "/contact", destination: BSKY_ACCOUNT_LINK}
  ];

  if (!isEmpty(SERVICE_TIP_URL)) {
    rules.push({path: "/tip", destination: SERVICE_TIP_URL})
  }

  if (!isEmpty(SOURCE_URL)) {
    rules.push({path: "/source", destination: SOURCE_URL})
  }
  return rules.map((itm) => { return `${itm.path} ${itm.destination}`}).join("\n");
};