import { raw } from 'hono/html';
import { Child } from 'hono/jsx';
import { ScriptInclusionLevel } from '../enums';
import { APP_NAME } from "../siteinfo";
import type { BaseElementProps, PreloadRules } from "../types";
import { getScriptsForInteractivity } from './helpers/includesList';
import { HTMXNonceTag, IncludeDependencyTags, PreloadDependencyTags } from "./helpers/includesTags";
import { MetaTags, PersonaTags } from './helpers/metaTags';

type BaseLayoutProps = BaseElementProps & {
  children: Child;
  title: string;
  noIndex?: boolean;
  mainClass?: string;
  interactivity?: ScriptInclusionLevel;
  preloads?: PreloadRules[];
  nonce?: string;
};

export const BaseLayout = (props: BaseLayoutProps) => {
  let preloadList: PreloadRules[] = getScriptsForInteractivity(props.interactivity);
  const scriptIncludeList: PreloadRules[] = preloadList;

  // Preloaded scripts that were pushed in should
  // implement their own includes into the DOM
  if (props.preloads !== undefined)
    preloadList = preloadList.concat(props.preloads);

  return (<>
  {raw("<!DOCTYPE html>")}
  <html data-theme="dark" lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>{APP_NAME} - {props.title}</title>
      <MetaTags />
      <PreloadDependencyTags scripts={preloadList} />
      <PersonaTags />
      {props.noIndex ? <meta name="robots" content="noindex" /> : null}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="manifest" href="/site.webmanifest" />
      <link rel="preload" href="/logo.svg" as="image" type="image/svg+xml" />
      {props.nonce !== undefined && props.interactivity != ScriptInclusionLevel.NonInteractive
        ? <HTMXNonceTag nonce={props.nonce} /> : null}
      <IncludeDependencyTags scripts={scriptIncludeList} nonce={props.nonce} />
    </head>
    <body>
      <container class="pico">
        <main class={props.mainClass}>
          {props.children}
        </main>
      </container>
    </body>
  </html>
  </>);
}