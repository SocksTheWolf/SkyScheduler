# SkyScheduler

[![Deploy Cloudflare Workers](https://img.shields.io/badge/deploy-cloudflare_workers-F38020?logo=cloudflareworkers)](https://deploy.workers.cloudflare.com/?url=https://github.com/socksthewolf/skyscheduler)
[![Bluesky followers](https://img.shields.io/bluesky/followers/skyscheduler.work)](https://skyscheduler.work/bsky)


[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Static Badge](https://img.shields.io/badge/NodeJS_Version-v24.15-5FA04E?logo=nodedotjs)
[![Website](https://img.shields.io/website?logo=cloudflare&color=teal&cacheSeconds=7200&down_color=red&url=https%3A%2F%2Fskyscheduler.work)](https://skyscheduler.work)
[![Mozilla HTTP Observatory Grade](https://img.shields.io/mozilla-observatory/grade/skyscheduler.work?logo=firefox&color=purple)](https://developer.mozilla.org/en-US/observatory/analyze?host=skyscheduler.work)

[![GitHub branch check runs](https://img.shields.io/github/check-runs/socksthewolf/skyscheduler/main?logo=github)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/socksthewolf/skyscheduler?logo=vscodium&color=blue)
![GitHub repo size](https://img.shields.io/github/repo-size/socksthewolf/skyscheduler?color=lightblue)](https://github.com/socksthewolf/skyscheduler)

![SkyScheduler Dashboard](https://raw.githubusercontent.com/SocksTheWolf/SkyScheduler/refs/heads/main/assets/screenshots/dashboard.png)

## Overview

![GitHub Created At](https://img.shields.io/github/created-at/socksthewolf/skyscheduler)

SkyScheduler is a lightweight Cloudflare Workers-based microservice application that allows you and/or your team to schedule/repost posts to a Bluesky account effortlessly. Perfect for content creators and social media managers who want to plan their social media content in advance.

## Features

- **Multiple user/account handling**: Manage multiple users/bsky accounts easily
- **Bluesky Post Scheduling**: Schedule multiple posts to your Bluesky account
- **Custom Time Slots**: Time selection is limited to 1hr/30m/15m/10m/5m intervals (configurable, default 1hr) to optimize worker execution and reduce unnecessary runs
- **Post Threading**: Schedule entire post threads with full media support per post!
- **Simple Setup**: Fairly minimal setup and easy to use
- **Supports media posts**: Automatically handles content tagging and formatting your media so that it looks the best on BSky. Image transforms via Cloudflare Images
- **Handles Link Embeds**: Post your content with a link embed easily!
- **Automatic reposting**: Schedule how many times you want your post to be reposted on the network. Get more visibility and engagement without having to do more work
- **Repost anything**: Need to retweet something made out of SkyScheduler? Yeah, you can.
- **Invite Keys**: Want to throttle the signups to your portal or keep the pool to friends/org only? Use invite keys to manage signups
- **SSG Page Generation**: Most pages can be automatically built and served statically, to save on processing overhead.

## Getting Started

### Prerequisites

- Node.js (v24.15 or later)
- Package Manager
- Cloudflare Pro Workers account (you will hit CPU limits due to betterauth and egress to atproto)

### Installation

1. Clone the repository

```bash
git clone https://github.com/socksthewolf/skyscheduler.git
cd skyscheduler
```

2. Copy environment variables template

```bash
cp .env.example .env
```

3. Configure your `.env` file based off the `.env.example` file. Comments to what each variable needs to be set to can be found in there.

**Note**: When deploying, these variables should also be configured as secrets in your Cloudflare worker dashboard. You can also do this via `npx wrangler secret put <NAME_OF_SECRET>`.

_Alternatively_, make a file like `.env.prod` and use `npx wrangler secret bulk .env.prod` to upload all the settings at once.

4. Update your `wrangler.toml` with changes that reflect your account.
   - You'll need to update the values for the kv, r2, queues, d1 to reflect the bindings on your account.
   - Also make sure you update the `BETTER_AUTH_URL` to your working url as well.
   - If you allow image resizing, you should also modify `IMAGE_SETTINGS`'s `bucket_url` to the correct host.
   - Do remember to update/remove the domain bindings!

5. Install dependencies

```bash
npm install
```

6. Modify any site information located in:

   - `limits.ts` - site configuration and application limits
   - `siteinfo.ts` - site information such as name, description, domain, etc
   - `.ssclirc` - sitemap domain
   - `/assets/_redirects` - redirect configuration
   - `/assets/robots.txt` - change the url to your sitemap

7. Deploy the application to Cloudflare Workers. You might need to login to your Cloudflare account if you haven't already.

```bash
npm run deploy
```

**NOTE**: You can also run dev by using `npm run dev`.

8. Create your D1 tables using the following command, this will set up your tables both locally and remotely.

**NOTE**: If you encounter issues running remotely, you can run `npm run migrate:prod` or `npm run migrate:local` respectively.

```bash
npm run migrate:all
```

9. Run your application and go to `/setup`. This will create the admin account.

## Configuration

### Environment Variables

Ensure you have configured the `.env` file with the necessary credentials and settings. The file is git-ignored to protect your sensitive information.

### Application Variables

Most of the application can be modified with `wrangler.toml`'s vars section or via `src/limits.ts`. Both files are heavily commented to explain what the options control.

### Site Variables

Modifying key values such as meta tag data, the application name and any descriptions is fully controlled via `src/siteinfo.ts`.

Changing the values in that file will modify the visual display of the application's web output.

### Minimization

SkyScheduler uses the minified versions of the scripts in `assets/js` and `assets/css`.

These are generated on the fly whenever any typescript file is changed or the application is deployed/ran.

## Commands

SkyScheduler comes with a lot of commands to help manage the service. Documentation on the commands can be found in `package.json`.

The most important ones to know:

- `dev` - runs the app in a local environment
- `generate` - run anytime you modify a file in the `src/db` folder. This will generate SQL migration files
- `migrate` - commit the SQL migrations to local/prod databases.
- `migrate:local` - migrates the SQL changes to your local dev instance
- `migrate:prod` - does the same but commits remotely. **Note**: This has a chance of wrangler failing to commit, you may have to run it more than once (it is safe to execute)
- `invite:generate` - generates a valid invite key
- `invite:local/remote` - commits an invite key to the invite store
- `sitemap` - generates a sitemap.xml file (there's a github action that will do this automatically as well)
- `types` - whenever `wrangler.toml` changes or wrangler updates, run this command

## Project Structure

```text
skyscheduler/
├── assets/
│   ├── css/
│   ├── dep/
│   ├── icons/
│   ├── js/
│   ├── screenshots/
│   └── thumbs/
├── src/
│   ├── auth/
│   ├── classes/
│   ├── db/
│   ├── endpoints/
│   ├── layout/
│   ├── middleware/
│   ├── pages/
│   ├── statics/
│   ├── utils/
│   └── validation/
├── migrations/
├── .vscode/
├── .env.example
├── .node-version
├── .markdownlint.json
├── .minify.json
├── .ssclirc
├── auth.config.ts
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

This project's source code is licensed under the MIT License.
Name, Logos and Branding are copyright SocksTheWolf, all rights reserved.

See the [LICENSE](LICENSE) file for details.

---
_Source hosted on [Github](https://github.com/SocksTheWolf/SkyScheduler), mirrored on [tangled](https://tangled.org/socksthewolf.com/skyscheduler)_
