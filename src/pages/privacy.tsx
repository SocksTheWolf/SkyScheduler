import FooterCopyright from "../layout/footer";
import { BaseLayout } from "../layout/main";
import NavTags from "../layout/navTags";


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
              <li>Anything you explicitly provide to us (post content, bsky app password, attached media, etc)</li>
              <li>Anything you upload for processing in order to fulfill your posts to the BlueSky network</li>
            </ul>
          </p>
          <h4>How Data is Used</h4>
          <p>We use the data that you provide to make transmit BlueSky posts on your behalf to the BlueSky PDS (or a PDS of your own choosing).<br /><br />
            <strong>Note that</strong>:
            <ul>
              <li>Images are sent to Cloudflare Images compressor to compress the file size in order to upload onto BlueSky</li>
              <li>Outside of the above we do not share the data with any other third party outside of BlueSky themselves (to transmit your content for posting)</li>
              <li>Data is not accessible to the maintainers of the website</li>
              <li>We do not sell your data to any third party</li>
              <li>No data is used for genAI purposes nor for training generative AI models</li>
            </ul>
          </p>
          <footer>
            <FooterCopyright />
          </footer>
        </article>
      </section>
    </BaseLayout>
  )
};