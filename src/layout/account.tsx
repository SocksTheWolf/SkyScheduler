import { html } from 'hono/html';
import type { Child } from 'hono/jsx';
import type { HtmlEscapedString } from 'hono/utils/html';

type FooterLink = {
  title: string;
  url: string;
};

type AccountFormProps = {
  children: Child;
  title: string;
  submitText?: string;
  loadingText: string;
  endpoint: string;
  successText: string;
  redirect: string;
  disabledByDefault?: boolean;
  customRedirectDelay?: number;
  footerLinks?: FooterLink[]
  footerHTML?: string | Promise<HtmlEscapedString>;
  nonce?: string
};

export default function AccountHandler(props: AccountFormProps) {
  const footerLinkHTML = props.footerLinks?.map((el: FooterLink) => {
    return (<span><a class="contrast outline" href={el.url}>{el.title}</a></span>);
  });
  return (<section class="container">
    <article>
      <header>
        <center><h3>{props.title}</h3></center>
      </header>
      <form id="loginForm">
        {props.children}
        <center>
          <button type="submit" disabled={props.disabledByDefault || false}>
            {props.submitText || props.title}
          </button>
        </center>
      </form>
      <center>
        <span aria-busy="true" id="loading" hidden>{props.loadingText}</span>
      </center>
      <footer>
        <center>
          <span id="footerLinks">
            {props.footerLinks ? <small>{footerLinkHTML}</small> : (props.footerHTML || "")}
          </span>
        </center>
      </footer>
    </article>
    <script type="text/javascript" nonce={props.nonce}>
    {html`
      easySetup("${props.endpoint}", "${props.successText}", "${props.redirect}", ${props.customRedirectDelay || 0});
    `}
    </script>
  </section>);
}