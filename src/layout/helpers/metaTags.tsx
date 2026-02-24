import { raw } from "hono/html";
import { APP_NAME, PROJECT_AUTHOR, PROJECT_AUTHOR_SITE, SITE_DESCRIPTION, SITE_URL, SOCIAL_CARD_IMAGE } from "../../siteinfo";

export default function MetaTags() {
  return (
    <>
      <meta name="title" content={APP_NAME} />
      <meta name="description" content={SITE_DESCRIPTION} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={SITE_URL} />
      <meta property="og:title" content={APP_NAME} />
      <meta property="og:description" content={SITE_DESCRIPTION} />
      <meta property="og:image" content={SOCIAL_CARD_IMAGE} />
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={SITE_URL} />
      <meta property="twitter:title" content={APP_NAME} />
      <meta property="twitter:description" content={SITE_DESCRIPTION} />
      <meta property="twitter:image" content={SOCIAL_CARD_IMAGE} />
      <script type="application/ld+json">
      {raw(`{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "creator": { "@type": "Person",    "name": "${PROJECT_AUTHOR}",    "url": "${PROJECT_AUTHOR_SITE}" },
        "copyrightYear": ${new Date().getFullYear()},
        "name": "${APP_NAME}",
        "url": "${SITE_URL}"
      }`)}
      </script>
    </>
  );
};