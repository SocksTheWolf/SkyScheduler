# SkyScheduler

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Deploy to Cloudflare Workers](https://img.shields.io/badge/deploy-cloudflare_workers-F38020?logo=cloudflareworkers)](https://deploy.workers.cloudflare.com/?url=https://github.com/socksthewolf/skyscheduler)

## Overview

SkyScheduler is a lightweight Cloudflare Workers-based microservice application that allows you and/or your team to schedule posts to a Bluesky account effortlessly. Perfect for content creators and social media managers who want to plan their social media content in advance.

## Features

- **Multiple user/account handling**: Have your friends also be able to post and repost stuff automatically! Wow!
- **Bluesky Post Scheduling**: Schedule multiple posts to your Bluesky account
- **Hourly Time Slots**: Time selection is limited to hourly intervals to optimize worker execution and reduce unnecessary runs
- **Simple and Lightweight**: Minimal setup and easy to use
- **Supports media posts**: Automatically handles content tagging and formating your media so that it looks the best on BSky. Image transforms via Cloudflare Images.
- **Handles threading**: Post is over the 300 character limit? The system will autothread your posts for you
- **Automatic reposting**: Schedule how many times you want your post to be retweeted on the network. Get more visibility and engagement without having to do more work.

## Getting Started

### Prerequisites

- Node.js (v20.x or later)
- Package Manager
- Cloudflare Pro Workers account

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
   - `BETTER_AUTH_SECRET` - a cryptographic value to use for any authentication you might be using
   - `BETTER_AUTH_URL` - the working url of your application.
   - `DEFAULT_ADMIN_USER` - the admin username (this should be a bsky handle)
   - `DEFAULT_ADMIN_PASS` - the admin password
   - `DEFAULT_ADMIN_BSKY_PASS` - the admin default app password
   - `SIGNUP_TOKEN_SECRET` - the invite code/password for this app.

These settings should reflect the same sort of values that you would set for your BetterAuth install.

Note: When deploying, these variables should also be configured as secrets in your Cloudflare worker dashboard. You can also do this via `npx wrangler secret put <NAME_OF_SECRET>`.

4. Install dependencies
```bash
npm install
```

5. Run the development server
```bash
npm run dev
```

6. Deploy the application to Cloudflare Workers. You might need to login to your Cloudflare account if you haven't already.
```bash
npm run deploy
```

7. Create your D1 tables using the following command, this will set up your tables both locally and remotely
```bash
npm run migrate:all
```

## Configuration

### Environment Variables

Ensure you have configured the `.dev.vars` file with the necessary credentials and settings. The file is git-ignored to protect your sensitive information.

## Project Structure

```
skyscheduler/
├── src/
│   ├── db/
│   ├── layout/
│   ├── pages/
│   └── utils/
├── migrations/
├── .dev.vars
├── drizzle.config.ts
├── package.json
└── wrangler.toml
```

## Contributing

We welcome contributions!

### Ways to Contribute

- Report bugs
- Suggest enhancements
- Submit pull requests

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
