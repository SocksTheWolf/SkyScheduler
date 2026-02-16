import FooterCopyright from "../layout/helpers/footer";
import { BaseLayout } from "../layout/main";
import NavTags from "../layout/helpers/navTags";

export default function PrivacyPolicy() {
  return (
    <BaseLayout title="SkyScheduler - Privacy Policy" mainClass="homepage">
      <NavTags />
      <section class="container">
        <article>
          <header><h3>Privacy Policy</h3></header>
          <p>
            Usage of this website requires collection of data that you provide. Usage of this website is considered an agreement to this policy.
          </p>
          <h4>Data Collected</h4>
          <p>
            <ul>
              <li>Anything you explicitly provide to us (post content, app password, attached media, etc)</li>
              <li>Anything you upload for processing in order to deliver your posts to the BlueSky network</li>
            </ul>
          </p>
          <h4>Who We Share Data With</h4>
          <p>
            <ol>
              <li>Cloudflare
                <ul>
                  <li>Images are sent to Cloudflare Images compressor to optimize the file size in order to upload onto BlueSky</li>
                  <li>CF's Turnstile captcha service is used during signup and password recovery to prevent botted behaviors</li>
                  <li>Data is stored in Cloudflare's D1/R2/KV storage containers</li>
                  <li>Media may be scanned by Cloudflare's <a rel="noopener nofollow noindex" href="https://developers.cloudflare.com/cache/reference/csam-scanning/" class="secondary">illicit material detection service</a>.<br />
                  &nbsp;Said media is not allowed on this service and violators will be banned.</li>
                </ul>
              </li>
              <li>Bluesky/Custom PDS
                <ul>
                  <li>To determine what PDS your account is located on (via <a href="https://plc.directory" rel="nofollow" class="secondary">plc.directory</a>)</li>
                  <li>To transfer your content to the PDS your account is located on at the time you choose</li>
                </ul>
              </li>
            </ol>
          </p>
          <h4>How Data is Used</h4>
          <p>We use the data that you provide to transmit your content to the BlueSky PDS (or a PDS of your own choosing) on your behalf.<br />
            <div style="margin-left: 15px">
              <strong>Note that</strong>:
              <ul>
                <li>Data is not accessible to the maintainers of this service</li>
                <li>We do not sell your data to any third party</li>
                <li>No data is used for genAI purposes nor for training generative AI models</li>
                <li>You can verify this by just looking at <a href="https://github.com/socksthewolf/skyscheduler" class="secondary" ref="noopener nofollow">the source code</a></li>
              </ul>
            </div>
          </p>
          <h4>Links to other policies</h4>
          <p>Here are the privacy policies for the services that we do use, these links are not kept up to date and may change due to the nature of being from third parties.</p>
          <ul>
            <li><a class="secondary" href="https://www.cloudflare.com/privacypolicy/" rel="noopener nofollow">Cloudflare</a></li>
            <li><a class="secondary" href="https://www.cloudflare.com/turnstile-privacy-policy/" rel="noopener nofollow">Cloudflare Turnstile</a></li>
            <li><a class="secondary" href="https://bsky.social/about/support/privacy-policy" rel="noopener nofollow">BlueSky</a></li>
          </ul>
          <footer>
            <FooterCopyright />
          </footer>
        </article>
      </section>
    </BaseLayout>
  )
};