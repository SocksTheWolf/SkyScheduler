import { raw } from "hono/html";
import { APP_NAME } from "../../limits";

export default function MetaTags() {
  /* Modify these to change meta information on all pages. */
  const URL: string = "https://skyscheduler.work";
  const Description: string = "Schedule and automatically repost on Bluesky! Boost engagement and reach more people no matter what time of day!";
  const SocialImage: string = `${URL}/dashboard.png`;

  return (
    <>
      <meta name="title" content={APP_NAME} />
      <meta name="description" content={Description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={URL} />
      <meta property="og:title" content={APP_NAME} />
      <meta property="og:description" content={Description} />
      <meta property="og:image" content={SocialImage} />
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={URL} />
      <meta property="twitter:title" content={APP_NAME} />
      <meta property="twitter:description" content={Description} />
      <meta property="twitter:image" content={SocialImage} />
      <script type="application/ld+json">
      {raw(`{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "${APP_NAME}",
        "headline": "${APP_NAME}",
        "url": "${URL}"
      }`)}
      </script>
    </>
  );
};