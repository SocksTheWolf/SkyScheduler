// Various information that is hardcoded here, that can be grabbed from anywhere else.
// Basically hard coded site info without the need for CF bindings passed around
// or having to figure out the domain by parsing request urls.

// Name of the application
export const APP_NAME: string = "SkyScheduler";
// Site URL, used in places where we won't have the CF env bindings (most static rendered assets)
export const SITE_URL: string = "https://skyscheduler.work";
// Description of the website, used for meta tags and social cards.
export const SITE_DESCRIPTION: string = "Schedule and automatically repost on Bluesky! Boost engagement and reach more people no matter what time of day!";
// Link to the image to display on the social card.
export const SOCIAL_CARD_IMAGE: string = `${SITE_URL}/social-card.png`;

// The public repository that this application can be found on
export const APP_REPO: string = "https://github.com/SocksTheWolf/skyscheduler";

// Author information, used for JSON-LD and footers
export const PROJECT_AUTHOR: string = "SocksTheWolf";
export const PROJECT_AUTHOR_SITE: string = "https://socksthewolf.com";

// This line shows up on the dashboard when the user logs in, located under the logo.
export const DASHBOARD_TAG_LINE: string = "Schedule Bluesky posts effortlessly";

// If the logo image should be rendered on the site.
export const LOGO_ENABLED: boolean = true;

// if the support bar should be shown or not. Currently is only visible on the dashboard page
export const SHOW_SUPPORT_PROGRESS_BAR: boolean = false;

// for the progress bar, this is an easily editable file for updating the bar
// maybe we'll support webhooks in the future, but w/e

export const PROGRESS_TOTAL: number = 10;
export const PROGRESS_MADE: number = 0;
