// Various information that is hardcoded here, that can be grabbed from anywhere else.
// Basically hard coded site info without the need for CF bindings passed around
// or having to figure out the domain by parsing request urls.

export const APP_NAME: string = "SkyScheduler";
export const SITE_URL: string = "https://skyscheduler.work";
export const SITE_DESCRIPTION: string = "Schedule and automatically repost on Bluesky! Boost engagement and reach more people no matter what time of day!";


// if the support bar should be shown or not. Currently is only visible on the dashboard page
export const SHOW_SUPPORT_PROGRESS_BAR: boolean = false;

// for the progress bar, this is an easily editable file for updating the bar
// maybe we'll support webhooks in the future, but w/e

export const PROGRESS_TOTAL: number = 10;
export const PROGRESS_MADE: number = 0;
