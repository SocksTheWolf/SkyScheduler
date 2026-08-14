// Various information that is hardcoded here, that can be grabbed from anywhere else.
//
// Basically hard coded site info without the need for CF bindings passed around
// or having to figure out the domain by parsing request urls.

// Name of the application
export const APP_NAME: string = "SkyScheduler";

// Site hostname, this should also be the handle of your bsky account for this service.
export const SERVICE_DOMAIN: string = "skyscheduler.work";

// Service account, this should be the handle of the bsky account that sends
// things like password resets and be a general point of contact.
export const SERVICE_ACCOUNT: string = SERVICE_DOMAIN;
export const BSKY_ACCOUNT_LINK: string = `https://bsky.app/profile/${SERVICE_DOMAIN}`;
// The atproto did for the /.well-known/ path. Leave blank for no injection.
// This should reflect the did for your service account.
export const ATPROTO_DID: string = "did:plc:ecfcvvlqmadysyik3thlbs3c";

// Site URL, used in places where we won't have the CF env bindings (most static rendered assets)
export const SITE_URL: string = `https://${SERVICE_DOMAIN}`;

// Description of the website, used for meta tags and social cards.
export const SITE_DESCRIPTION: string =
  "Schedule and automatically repost on Bluesky! Boost engagement and reach more people no matter what time of day!";
// Link to the image to display on the social card.
export const SOCIAL_CARD_IMAGE: string = `${SITE_URL}/social-card.png`;

// Author information, used for JSON-LD and footers
export const PROJECT_AUTHOR: string = "SocksTheWolf";
export const PROJECT_AUTHOR_SITE: string = "https://socksthewolf.com";

// This line shows up on the dashboard when the user logs in, located under the logo.
export const DASHBOARD_TAG_LINE: string = "Schedule Bluesky posts effortlessly";

// An optional link to a thread or other page to sign up for invite keys.
// if not using invite keys, leave this string blank or undefined.
export const SITE_INVITE_URL: string | undefined = "";

// If the logo image should be rendered on the site.
export const LOGO_ENABLED: boolean = true;

// App Manifest settings
export const APP_MANIFEST_GUID: string = "com.socksthewolf.skyscheduler";
export const APP_MANIFEST_THEME_COLOR: string = "#80b3e0";
export const APP_MANIFEST_BG_COLOR: string = "#3c5479";

// Links to the open source repository
export const SOURCE_URL: string = "https://github.com/SocksTheWolf/skyscheduler";

// for the progress bar, this is an easily editable file for updating the bar
// maybe we'll support webhooks in the future, but w/e

// leave blank to not expose a tipping url.
export const SERVICE_TIP_URL: string = "https://ko-fi.com/socksthewolf/tip";
export const PROGRESS_TOTAL: number = 10;
export const PROGRESS_MADE: number = 0;