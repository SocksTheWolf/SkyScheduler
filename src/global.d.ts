// Global definition injection for getting HTMX attributes to be understood by typescript
import 'typed-htmx';

declare module 'hono/jsx' {
  namespace JSX {
    interface HTMLAttributes extends HtmxAttributes {}
  }
}