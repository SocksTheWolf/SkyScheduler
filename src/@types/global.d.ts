// Global definition injection for getting HTMX attributes to be understood by typescript
// and for extending the context renderer
import "typed-htmx";

declare module "hono/jsx" {
  namespace JSX {
    interface HTMLAttributes extends HtmxAttributes {}
  }
}
