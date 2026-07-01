import {
  APP_MANIFEST_BG_COLOR,
  APP_MANIFEST_GUID,
  APP_MANIFEST_THEME_COLOR, APP_NAME,
  SITE_DESCRIPTION, SITE_URL
} from "../siteinfo";

export function appManifestGenerate() {
  return {
    "name": APP_NAME,
    "short_name": APP_NAME,
    "categories": [
      "social",
      "social networking",
      "productivity",
      "utilities"
    ],
    "description": SITE_DESCRIPTION,
    "icons": [
      {
        "src": "/android-chrome-192x192.png",
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "maskable"
      },
      {
        "src": "/android-chrome-192x192.png",
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "any"
      },
      {
        "src": "/android-chrome-512x512.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any"
      }
    ],
    "theme_color": APP_MANIFEST_THEME_COLOR,
    "orientation": "portrait",
    "lang": "en",
    "scope": SITE_URL,
    "start_url": "/dashboard",
    "background_color": APP_MANIFEST_BG_COLOR,
    "display": "standalone",
    "id": APP_MANIFEST_GUID,
    "prefer_related_applications": false,
    "dir": "ltr",
    "shortcuts": [
      {
        "name": "New Post",
        "url": "/dashboard?post",
        "description": "Schedule a new post"
      },
      {
        "name": "New Retweet",
        "url": "/dashboard?retweet",
        "description": "Schedule a new retweet"
      }
    ],
    "screenshots": [
      {
        "src": "screenshots/home.png",
        "sizes": "495x857",
        "type": "image/png",
        "form_factor": "narrow",
        "label": `${APP_NAME} homepage`
      },
      {
        "src": "screenshots/dashboard.png",
        "sizes": "1200x618",
        "type": "image/png",
        "form_factor": "wide",
        "label": `Dashboard view of ${APP_NAME}`
      },
      {
        "src": "screenshots/dash1.png",
        "sizes": "495x857",
        "type": "image/png",
        "form_factor": "narrow",
        "label": "Scheduled Post List"
      },
      {
        "src": "screenshots/dash2.png",
        "sizes": "495x857",
        "type": "image/png",
        "form_factor": "narrow",
        "label": "New Post View"
      }
    ],
    "edge_side_panel": {
      "preferred_width": 510
    }
  };
};