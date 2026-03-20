# SkyScheduler

[![Deploy Cloudflare Workers](https://img.shields.io/badge/deploy-cloudflare_workers-F38020?logo=cloudflareworkers)](https://deploy.workers.cloudflare.com/?url=https://github.com/socksthewolf/skyscheduler)
[![Bluesky followers](https://img.shields.io/bluesky/followers/skyscheduler.work)](https://skyscheduler.work/bsky)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Static Badge](https://img.shields.io/badge/NodeJS_Version-v24.11-5FA04E?logo=nodedotjs)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/socksthewolf/skyscheduler?color=blue)
![GitHub repo size](https://img.shields.io/github/repo-size/socksthewolf/skyscheduler?color=lightblue)


![SkyScheduler Dashboard](https://raw.githubusercontent.com/SocksTheWolf/SkyScheduler/refs/heads/main/assets/dashboard.png)

## Overview

![GitHub Created At](https://img.shields.io/github/created-at/socksthewolf/skyscheduler)

SkyScheduler is a lightweight Cloudflare Workers-based microservice application that allows you and/or your team to schedule/repost posts to a Bluesky account effortlessly. Perfect for content creators and social media managers who want to plan their social media content in advance.

## Features

- **Multiple user/account handling**: Manage multiple users/bsky accounts easily
- **Bluesky Post Scheduling**: Schedule multiple posts to your Bluesky account
- **Hourly Time Slots**: Time selection is limited to hourly intervals to optimize worker execution and reduce unnecessary runs
- **Post Threading**: Schedule entire post threads with full media support per post!
- **Simple Setup**: Fairly minimal setup and easy to use
- **Supports media posts**: Automatically handles content tagging and formatting your media so that it looks the best on BSky. Image transforms via Cloudflare Images
- **Handles Link Embeds**: Post your content with a link embed easily!
- **Automatic reposting**: Schedule how many times you want your post to be reposted on the network. Get more visibility and engagement without having to do more work
- **Repost anything**: Need to retweet something made out of SkyScheduler? Yeah, you can.
- **Invite Keys**: Want to throttle the signups to your portal or keep the pool to friends/org only? Use invite keys to manage signups

## Getting Started

### Prerequisites

- Node.js (v24.11 or later)
- Package Manager
- Cloudflare Pro Workers account (you will hit CPU limits otherwise)

### Installation

1. Clone the repository

```bash
git clone https://github.com/socksthewolf/skyscheduler.git
cd skyscheduler
```

2. Copy environment variables template

```bash
cp .dev.vars.example .dev.vars
```

3. Configure your `.dev.vars` file with the following environment variables:
   - `BETTER_AUTH_SECRET` - the cryptographic hash to use better auth ([you can generate one from this page](https://www.better-auth.com/docs/installation))
   - `BETTER_AUTH_URL` - the working url of your site (this should be "*" in dev).
   - `DEFAULT_ADMIN_USER` - the admin bsky handle
   - `DEFAULT_ADMIN_PASS` - the admin password
   - `DEFAULT_ADMIN_BSKY_PASS` - the above account's bsky app password
   - `TURNSTILE_PUBLIC_KEY` - the turnstile public key for captcha
   - `TURNSTILE_SECRET_KEY` - the turnstile secret key for captcha
   - `RESIZE_SECRET_HEADER` - a header value that will be included on requests while trying to resize images. Protects the resize bucket while still making it accessible to CF Images.

**Note**: When deploying, these variables should also be configured as secrets in your Cloudflare worker dashboard. You can also do this via `npx wrangler secret put <NAME_OF_SECRET>`.

_Alternatively_, make a file like `.env.prod` and use `npx wrangler secret bulk FILENAME` to upload all the settings at once.

4. Update your `wrangler.toml` with changes that reflect your account.
   - You'll need to update the values for the kv, r2, queues, d1 to reflect the bindings on your account.
   - Also make sure you update the `BETTER_AUTH_URL` to your working url as well.
   - Do remember to update/remove the domain bindings!

5. Install dependencies

```bash
npm install
```

6. Run the development server

```bash
npm run dev
```

7. Deploy the application to Cloudflare Workers. You might need to login to your Cloudflare account if you haven't already.

```bash
npm run deploy
```

8. Create your D1 tables using the following command, this will set up your tables both locally and remotely.

**NOTE**: If you encounter issues running remotely, you can run the command again.

```bash
npm run migrate:all
```

9. Modify any site information located in:

   - `limits.ts` - site configuration and application limits
   - `siteinfo.ts` - site information such as name, description, domain, etc
   - `.ssclirc` - sitemap domain
   - `site.webmanifest` - naming and color schemes

10. Run your application and go to `/setup`. This will create the admin account.

## Configuration

### Environment Variables

Ensure you have configured the `.dev.vars` file with the necessary credentials and settings. The file is git-ignored to protect your sensitive information.

### Application Variables

Most of the application can be modified with `wrangler.toml`'s vars section or via `src/limits.ts`. Both files are heavily commented to explain what the options control.

### Site Variables

Modifying key values such as meta tag data, the application name and any descriptions is fully controlled via `src/siteinfo.ts`. Changing these fields will modify the rest of the application's web output.

### Minimization

The application by default is configured to use the minified versions of the scripts in `assets/js` and `assets/css`. By default, all minimized files will rebuild whenever any typescript file is changed or the application is deployed/ran.

## Project Structure

```text
skyscheduler/
├── assets/
│   ├── css/
│   ├── dep/
│   ├── icons/
│   ├── js/
│   └── thumbs/
├── src/
│   ├── auth/
│   ├── classes/
│   ├── db/
│   ├── endpoints/
│   ├── layout/
│   ├── middleware/
│   ├── pages/
│   ├── utils/
│   └── validation/
├── migrations/
├── .dev.vars
├── .node-version
├── .markdownlint.json
├── .minify.json
├── .ssclirc
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── wrangler.toml
```

### Middleware Stack

#### Server

- BetterAuth - site login/authentication
- BetterAuthCloudflare - helper for BetterAuth on CF
- hono - request routing/processing
- uuid - id generation
- zod - data validation
- image-dimensions - image data validation
- date-fns - date processing helpers
- drizzle - database orm/schemas
- just - js helper library
- human-id - passphrase generation for invite keys

#### Client

- [htmx](https://htmx.org/) - client requests and responsiveness
  - [form-json](https://github.com/xehrad/form-json) - for handling post edits
- [countable](https://github.com/RadLikeWhoa/Countable) - dynamic input counter
- [toastify](https://github.com/apvarun/toastify-js) - client notifications
- [dropzone](https://github.com/dropzone/dropzone) - file upload negotiation
- [tribute](https://github.com/redmine-ui/tribute) - client autocomplete library
- [pico](https://github.com/Yohn/PicoCSS) - styling, tabs, modals
- [mingcute](https://github.com/mingcute-design/mingcute-icons) - most icons

## Contributions

We welcome contributions! Here's some ways to contribute:

- Report bugs
- Suggest enhancements
- [Sponsor](https://ko-fi.com/socksthewolf/tip)

## License

This project's source code is licensed under the MIT License
Name, Logos and Branding are copyright SocksTheWolf, all rights reserved.

See the [LICENSE](LICENSE) file for details.

---
_Source hosted on [Github](https://github.com/SocksTheWolf/SkyScheduler), mirrored on [tangled](https://tangled.org/socksthewolf.com/skyscheduler)_
