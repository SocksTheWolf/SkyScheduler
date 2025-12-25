import { Context } from 'hono';
import { html } from 'hono/html';
import { Child } from 'hono/jsx';
import { HtmlEscapedString } from 'hono/utils/html';

type FooterLink = {
  title: string;
  url: string;
};

type AccountFormProps = {
  ctx?: Context;
  children: Child;
  title: string;
  submitText?: string;
  loadingText: string;
  endpoint: string;
  successText: string;
  redirect: string;
  footerLinks?: FooterLink[]
  footerHTML?: string | Promise<HtmlEscapedString>
};

export default function AccountHandler(props: AccountFormProps) {
  const footerLinkHTML = props.footerLinks?.map((el: FooterLink) => {
    return (<span><a class="contrast outline" href={el.url}>{el.title}</a></span>);
  });
  return (
    <section class="container">
      <article>
        <header>
          <center><h3>{props.title}</h3></center>
        </header>
        <form id="loginForm">
          {props.children}
          <center>
            <button type="submit">
              {props.submitText || props.title}
            </button>
          </center>
        </form>
        <center>
          <span aria-busy="true" id="loading" hidden>{props.loadingText}</span>
        </center>
        <footer>
          <center>
            <small id="footerLinks">
              {props.footerLinks ? footerLinkHTML : (props.footerHTML || "")}
            </small>
          </center>
        </footer>
      </article>
      <script type="text/javascript">
      {html`
        easySetup("${props.endpoint}", "${props.successText}", "${props.redirect}");
      `}
      </script>
    </section>
  );
}