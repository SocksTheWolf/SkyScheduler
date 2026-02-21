import { raw } from "hono/html";
import { APP_NAME, SITE_DESCRIPTION, SITE_URL } from "../../siteinfo";

export default function MetaTags() {
  const SocialImage: string = `${SITE_URL}/dashboard.png`;

  return (
    <>
      <meta name="title" content={APP_NAME} />
      <meta name="description" content={SITE_DESCRIPTION} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={SITE_URL} />
      <meta property="og:title" content={APP_NAME} />
      <meta property="og:description" content={SITE_DESCRIPTION} />
      <meta property="og:image" content={SocialImage} />
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={SITE_URL} />
      <meta property="twitter:title" content={APP_NAME} />
      <meta property="twitter:description" content={SITE_DESCRIPTION} />
      <meta property="twitter:image" content={SocialImage} />
      <script type="application/ld+json">
      {raw(`{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "${APP_NAME}",
        "headline": "${APP_NAME}",
        "url": "${SITE_URL}"
      }`)}
      </script>
    </>
  );
};