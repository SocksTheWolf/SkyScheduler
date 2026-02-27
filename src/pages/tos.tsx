import FooterCopyright from "../layout/helpers/footer";
import NavTags from "../layout/helpers/navTags";
import { BaseLayout } from "../layout/main";
import { APP_NAME } from "../siteinfo";

export default function TermsOfService() {
  return (
    <BaseLayout title="Terms of Service" mainClass="homepage">
      <NavTags />
      <section class="container">
        <article>
          <header><h3>Terms of Service</h3></header>
          <h4>Terms</h4>
          <p>
            By signing up and using the services provided by {APP_NAME} ("software") you agree to the terms set forth below.<br />
            If you do not agree to said terms, please delete your account at your earliest convenience (via "Account Settings" in the Dashboard).<br />
            Said deletion will be treated as a separation of you to this agreement.
          </p>
          <h4>Usage</h4>
          <p>By using this software you agree to:
            <ol>
              <li>Not use the service to scam, spam or to otherwise violate the terms of the <a class="secondary"
                href="https://bsky.social/about/support/tos" rel="nofollow noindex noopener" target="_blank">
                Bluesky Terms of Service</a>
              </li>
              <li>Not upload material that is illegal, illicit or stolen</li>
              <li>Not attempt to reverse engineer the software to cause damage or otherwise harm others</li>
              <li>Not hold the software nor its developers at fault for any damages, neither perceived nor tangible</li>
              <li>Grant {APP_NAME} a temporary, non-exclusive, royalty-free license to the content that you schedule
                for the sole purpose of transmitting it on your behalf via the ATProtocol
                to the PDS of your choosing (default: Bluesky).</li>
              <ul>
                <li>Upon successful transmission, content will be deleted from our temporary holding storage.</li>
              </ul>
            </ol>
            <hr />
            Violations of these agreements will allow {APP_NAME} to terminate your access to the website. Upon account deletion/termination, all temporarily stored content will be deleted.<br />
            Deletions may take up to 30 days to fully cycle out of backups.
          </p>
          <h4>Disclaimer/Limitations</h4>
          <p>{APP_NAME.toUpperCase()} IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
            IN NO EVENT SHALL THE AUTHORS, HOSTS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
            TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</p>
          <h4>Ammendum</h4>
          <p>The terms of service may be revised at any time without prior notification.
            Continued use of the website means that you agree to be bound by the current version of this document.</p>
          <footer>
            <FooterCopyright />
          </footer>
        </article>
      </section>
    </BaseLayout>
  )
};