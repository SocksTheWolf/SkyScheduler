// Global definition injection for getting HTMX attributes to be understood by typescript
// and for extending the context renderer
import 'typed-htmx';
import type { ScriptInclusionLevel } from './enums';
import type { PreloadRules } from './layout/helpers/includesTags';

declare module 'hono/jsx' {
  namespace JSX {
    interface HTMLAttributes extends HtmxAttributes {}
  }
}
/*
declare module "hono" {
  interface ContextRender {
    (
      content: string | Promise<string>,
      props: { title: string, noIndex?: boolean, mainClass?: string, interactivity?: ScriptInclusionLevel, preloads?: PreloadRules[], nonce?: string }
    ): Response
  }
}*/