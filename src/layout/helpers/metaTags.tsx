import { raw } from "hono/html";

export default function MetaTags() {
  /* Modify these to change meta information on all pages. */
  const Title: string = "SkyScheduler";
  const URL: string = "https://skyscheduler.work";
  const Description: string = "Schedule and automatically repost on Bluesky! Boost engagement and reach more people no matter what time of day!";
  const SocialImage: string = "https://skyscheduler.work/dashboard.png";

  return (
    <>
      <meta name="title" content={Title} />
      <meta name="description" content={Description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={URL} />
      <meta property="og:title" content={Title} />
      <meta property="og:description" content={Description} />
      <meta property="og:image" content={SocialImage} />
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={URL} />
      <meta property="twitter:title" content={Title} />
      <meta property="twitter:description" content={Description} />
      <meta property="twitter:image" content={SocialImage} />
      <script type="application/ld+json">
      {raw(`{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "${Title}",
        "headline": "${Title}",
        "url": "${URL}"
      }`)}
      </script>
    </>
  );
};