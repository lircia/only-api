# Only API

Only API is a Cloudflare Workers + Pages API gateway for OpenAI-compatible APIs. It provides a Worker backend, a Pages frontend, D1 storage, user login, registration, API key distribution, channel management, a Model Square, usage statistics, Workers usage monitoring, optional Telegram / WxPusher notifications, and optional Umami analytics.

Direct calls to an upstream API can suffer from high latency or connection failures when its service nodes are far away or the network route is unstable. Only API forwards requests through Cloudflare and may improve connectivity in these situations. It can also combine multiple OpenAI-compatible providers behind one API endpoint, so clients can use one address to access models from different channels.

We do not provide any API key or upstream API endpoint. This platform is only for API forwarding.

You may use a Cloudflare domain preferred-route or preferred-IP service to improve speed. The frontend does not call upstream providers directly, so the frontend domain usually does not need optimization. You can find optimization links through web search.

This repository is designed for GitHub hosting and Cloudflare dashboard deployment. The included `wrangler.toml` keeps the Worker entry point, name, ordinary variables, and Cron Trigger consistent; D1 is bound manually.

## Languages

- [中文](readme-zh.md)
- [日本語](readme-ja.md)
- [Deutsch](readme-de.md)
- [Русский](readme-ru.md)
- [العربية](readme-ar.md)
- [Ελληνικά](readme-el.md)

## Project Paths

| Purpose | Path |
| --- | --- |
| Pages frontend | `apps/web` |
| Worker backend | `apps/api/src/index.ts` |
| Worker deployment config | `wrangler.toml` |
| D1 schema SQL | `apps/api/migrations/0001_initial.sql` |
| Root dependency file | `package.json` |

## Main Features

- First super-admin setup with `ADMIN_SETUP_SECRET`.
- Independent switches for registration, email-code verification, email suffix validation, numeric QQ email prefix validation, and Turnstile. All are disabled by default.
- Optional Cloudflare Turnstile. The frontend Site Key is a Pages variable, and the backend Secret Key is a Worker variable.
- User API keys use the `oi-only-` prefix and support full display, copying, and deletion.
- OpenAI-compatible `/v1/*` forwarding.
- No user quota enforcement.
- Per-channel health tests use either one automatically completed `/v1/chat/completions` URL or an explicitly marked full URL, record latency, and sync models from upstream `/models`.
- Model Square with one model per row, folding, editable display names, per-channel batch add/delete, `-all` delete-all, and orphan cleanup.
- Admin user status/role editing and user deletion, with protection for the current user and super admin.
- Usage statistics for 3 hours, 1 day, 7 days, 15 days, and all time, with model, API Key name, and user breakdown tables.
- Workers usage monitoring shows used percent and remaining percent.
- With a Worker Cron Trigger, Workers usage is checked every 6 hours by default and can be pushed to Telegram or WxPusher.
- Optional Umami analytics for the Pages frontend and Worker backend.
- Frontend time display is adjusted to UTC+8.
- Built-in themes: black-white, light blue-white, yellow-purple, green-red, and pink-orange.
- Optional frontend background image by URL.

## Deployment 1: Deploy Worker

In Cloudflare Workers & Pages, create or open the Worker project and connect this GitHub repository.

Use these Worker build settings:

| Setting | Value |
| --- | --- |
| Root directory | blank or `/` |
| Build command | `npm ci` |
| Deploy command | `npx wrangler deploy` |

Wrangler is Cloudflare's official deployment tool. Cloudflare's Git build runs it automatically and reads `wrangler.toml`; you do not need to operate it locally. It deploys the code, preserves dashboard variables with `keep_vars = true`, and installs the hourly Cron Trigger. D1 is intentionally not declared in the file: after every Worker deployment, manually bind your existing D1 database as `DB` again if Cloudflare removed the binding.

The configuration uses `keep_vars = true`, so dashboard variables remain in place. Keep secrets in the Cloudflare dashboard and never write them into `wrangler.toml`.

## Deployment 2: Create Or Reuse D1 Database

Create a D1 database on the first deployment, or keep using the existing database on later updates.

Recommended database name:

```txt
only_api
```

The Worker binding name must be:

```txt
DB
```

Open the D1 console and execute all SQL from:

```txt
apps/api/migrations/0001_initial.sql
```

Tables created by the SQL:

| Table | Purpose |
| --- | --- |
| `users` | Users, admins, and super admins |
| `email_verifications` | 13-digit email verification codes |
| `sessions` | Login sessions |
| `api_keys` | User API keys |
| `channels` | Upstream API channels |
| `model_catalog` | Model Square models |
| `usage_logs` | API forwarding usage records |
| `worker_usage_snapshots` | Workers usage snapshots |
| `system_settings` | System settings |

## Deployment 3: Bind Worker Resources And Variables

After every Worker deployment, check the Worker bindings page and manually bind D1 if needed:

| Type | Name | Value |
| --- | --- | --- |
| D1 database | `DB` | your existing `only_api` database |

Required Worker variable for first setup:

| Name | Type | Purpose |
| --- | --- | --- |
| `ADMIN_SETUP_SECRET` | Secret | Password for first super-admin setup |

After the super admin exists, `ADMIN_SETUP_SECRET` is no longer read by the setup flow and may be removed or rotated.

Recommended Worker variables:

| Name | Type | Purpose |
| --- | --- | --- |
| `APP_ORIGIN` | Variable | Your Pages frontend URL; restricts CORS to this origin. Without it, CORS falls back to `*` |
| `API_PUBLIC_BASE_URL` | Variable | Public Worker root URL shown on the API Key page, for example `https://your-worker.workers.dev`; do not append `/v1` |

Optional email variables:

| Name | Type | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Resend API key |
| `RESEND_FROM` | Variable | Sender, for example `Only API <noreply@example.com>` |

Both email variables are required when email verification is enabled.

Optional Turnstile Worker variable:

| Name | Type | Purpose |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | Secret | Cloudflare Turnstile Secret Key |

When Turnstile is enabled, this Worker secret and the Pages variable `VITE_TURNSTILE_SITE_KEY` are both required.

Optional Workers usage variables:

| Name | Type | Purpose |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | Variable | Cloudflare account ID |
| `CF_API_TOKEN` | Secret | API token with permission to read Workers usage |
| `WORKERS_DAILY_REQUEST_LIMIT` | Variable | Daily request limit used for percent calculation, default `100000` |

Accepted aliases are `CLOUDFLARE_ACCOUNT_ID`, `CF_ACCOUNT_TAG`, `CLOUDFLARE_ACCOUNT_TAG`, `CLOUDFLARE_API_TOKEN`, `CF_TOKEN`, and `CLOUDFLARE_TOKEN`. A Zone ID cannot replace the Account ID for this GraphQL query.

Optional backend Umami variables:

| Name | Type | Purpose |
| --- | --- | --- |
| `UMAMI_BACKEND_ENABLED` | Variable | Set to `true` to enable Worker backend tracking |
| `UMAMI_BACKEND_HOST_URL` | Variable | Umami host URL, for example `https://cloud.umami.is` |
| `UMAMI_BACKEND_WEBSITE_ID` | Variable | Umami Website ID for backend tracking |
| `UMAMI_BACKEND_HOSTNAME` | Variable | Optional hostname shown in Umami, for example `api.example.com` |

Backend Umami can also be configured in System Settings. Worker variables override System Settings.

Telegram notification variables:

| Name | Type | Purpose |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Variable | Telegram chat, group, or channel ID |

WxPusher notification variables:

| Name | Type | Purpose |
| --- | --- | --- |
| `WXPUSHER_APP_TOKEN` | Secret | WxPusher AppToken |
| `WXPUSHER_UIDS` | Variable | Comma-separated UID list, required unless topic IDs are used |
| `WXPUSHER_TOPIC_IDS` | Variable | Comma-separated topic ID list, required unless UIDs are used |

Optional-feature requirement summary:

- Email verification: `RESEND_API_KEY` and `RESEND_FROM` are both required.
- Turnstile: Worker `TURNSTILE_SECRET_KEY` and Pages `VITE_TURNSTILE_SITE_KEY` are both required.
- Workers usage: `CF_ACCOUNT_ID` and `CF_API_TOKEN` are required; `WORKERS_DAILY_REQUEST_LIMIT` is optional and defaults to `100000`.
- Backend Umami: Website ID is required when enabled; Host URL and Hostname are optional. Environment variables are optional overrides for System Settings.
- Telegram: Bot Token and Chat ID are both required; all other Telegram variables are optional.
- WxPusher: AppToken and at least one UID or Topic ID are required; its other variables are optional.

Scheduled trigger for automatic checks and notifications:

The included `wrangler.toml` installs `0 * * * *`, which wakes the Worker once per hour. Channel checks default to every 60 minutes and the single test URL may wait up to 60 seconds. Workers usage is collected and, when notifications are enabled, pushed every 360 minutes (6 hours).

## Deployment 4: Deploy Pages Frontend

In Cloudflare Pages, connect the same GitHub repository.

Use these Pages build settings:

| Setting | Value |
| --- | --- |
| Framework preset | `React (Vite)` |
| Root directory | blank or `/` |
| Build command | `npm ci && npm run build:web` |
| Build output directory | `apps/web/dist` |

Required Pages variable:

| Name | Type | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Variable | Worker backend root URL actually used by the frontend, for example `https://your-worker.workers.dev`; do not append `/v1` |

Optional Pages variables:

| Name | Type | Purpose |
| --- | --- | --- |
| `NODE_VERSION` | Build variable | Set to `20` if Cloudflare asks for a Node.js build version |
| `VITE_TURNSTILE_SITE_KEY` | Variable | Public Turnstile Site Key; required when Turnstile is enabled |
| `VITE_BACKGROUND_IMAGE_URL` | Variable | Default frontend background image URL |
| `VITE_UMAMI_SCRIPT_URL` | Variable | Umami tracker script URL, for example `https://cloud.umami.is/script.js` |
| `VITE_UMAMI_WEBSITE_ID` | Variable | Frontend Umami Website ID; setting it also enables the fallback tracker |
| `VITE_UMAMI_HOST_URL` | Variable | Optional Umami host URL, mainly for self-hosted Umami |

`NODE_VERSION` and the background image URL are always optional. The Turnstile Site Key is conditionally required only when Turnstile is enabled. The three Umami variables are optional when frontend Umami is configured in System Settings; when using only Pages variables, Website ID and Script URL are required and Host URL is optional.

All variables whose names begin with `VITE_` are compiled into browser JavaScript and are publicly visible. Never place a secret key, upstream API key, Worker token, or Turnstile Secret Key in a `VITE_` variable.

`API_PUBLIC_BASE_URL` and `VITE_API_BASE_URL` normally contain the same Worker URL, but they have different jobs: the former is an optional Worker variable used only for displaying the client API address, while the latter is a required Pages build variable that controls actual frontend requests.

After Pages is deployed, set Worker variable `APP_ORIGIN` to the Pages URL.

## First Setup

Open the Pages frontend URL. The first visit shows the setup page.

You need:

- `ADMIN_SETUP_SECRET`
- super-admin email
- super-admin password
- site name

After the super admin is created, the setup page closes and the setup secret is no longer used by the frontend setup flow. Registration, email verification, email suffix validation, numeric QQ email prefix validation, Turnstile, Workers usage notifications, and Umami are all disabled by default; enable only the switches you need in System Settings.

## Registration Verification

When email verification is enabled, registration sends a 13-digit numeric code by email instead of a link.

- The code is valid for 13 minutes.
- Each code allows 3 attempts.
- Resend cooldown is 67 seconds.
- Registration, email verification, email suffix validation, and numeric QQ email prefix validation are all disabled by default.
- When email suffix validation is enabled, allowed domains are `qq.com`, `163.com`, `gmail.com`, `outlook.com`, `yeah.net`, `hotmail.com`, `126.com`, `foxmail.com`, `icloud.com`, `yahoo.com`, `sina.com`, and `live.com`.
- When numeric QQ email prefix validation is enabled, a `qq.com` address must use digits before `@`.

## Umami Analytics

Frontend Umami tracks visits to the Pages console. Configure it in System Settings, or use Pages variables `VITE_UMAMI_SCRIPT_URL`, `VITE_UMAMI_WEBSITE_ID`, and `VITE_UMAMI_HOST_URL`.

Backend Umami sends `backend_request` events through the official `POST /api/send` endpoint. Configure it in System Settings, or use Worker variables `UMAMI_BACKEND_ENABLED`, `UMAMI_BACKEND_HOST_URL`, `UMAMI_BACKEND_WEBSITE_ID`, and `UMAMI_BACKEND_HOSTNAME`. The backend Website ID is required when tracking is enabled. System Settings also provides a save-and-test button that sends an `umami_test` event.

Backend tracking does not send user email, API keys, or request bodies. It only sends route category, method, status code, and latency.

## Workers Usage And Notifications

Workers usage monitoring requires the Cloudflare account ID and API token variables. If they are missing, the frontend shows a configuration message.

Use the Account ID from the Cloudflare account overview, not a Zone ID. The token needs `Account > Account Analytics > Read`. The page now names missing variables and shows the last GraphQL error. Failed queries are not stored as zero-usage snapshots and do not send misleading usage notifications.

The page displays:

- current used percent
- current remaining percent
- daily request limit
- snapshot time range

The percent is calculated from the last 24 hours of Worker requests divided by `WORKERS_DAILY_REQUEST_LIMIT`. The default limit is `100000`.

Automatic collection defaults to every 6 hours and requires the Worker Cron Trigger described above. Automatic push also requires “Notify Workers usage” to be enabled. Clicking “collect now” sends a notification immediately whenever Telegram or WxPusher variables are configured, even if automatic push is disabled.

## API Usage

Client Base URL:

```txt
https://your-worker-domain.workers.dev/v1
```

Header:

```http
Authorization: Bearer oi-only-...
```

## Channel Base URL

Use the upstream API root at the version level.

| Provider | Channel Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| Other compatible providers | usually `https://domain/v1` |

By default the channel Base URL is completed once to `/v1/chat/completions`; no fallback suffixes are probed. Check “Full URL” when the entered address is already the complete endpoint: tests and gateway completion calls then use it unchanged. The successful URL and latency are recorded. Model synchronization still uses the channel Base URL plus `/v1/models`.

In Model Square, administrators can batch add or hide model names for one selected channel. During batch deletion, enter `-all` to hide every model belonging to that channel. Hidden models can be enabled again by batch adding their names. The orphan cleanup action removes model records left by deleted channels.

New API keys are displayed in full and can be copied or deleted. Keys created by older versions before plaintext storage cannot be recovered; create a new key if an old key only shows its prefix. Administrators can delete ordinary users, but cannot delete the currently logged-in account or a super-admin account.

## Troubleshooting

If the frontend cannot connect:

1. Check Pages variable `VITE_API_BASE_URL`.
2. Make sure it points to the Worker URL, not the Pages URL.
3. Redeploy Pages after changing Pages variables.
4. Check Worker binding `DB`.
5. Check the Worker `DB` binding and `APP_ORIGIN`. During first setup, also check `ADMIN_SETUP_SECRET`.

## Advanced Optional Variables

These are not required for normal deployment.

| Name | Purpose |
| --- | --- |
| `TELEGRAM_PARSE_MODE` | `HTML`, `MarkdownV2`, or `Markdown` |
| `TELEGRAM_MESSAGE_THREAD_ID` | Telegram forum topic thread ID |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | Telegram direct message topic ID |
| `TELEGRAM_DISABLE_NOTIFICATION` | Silent Telegram notification |
| `TELEGRAM_PROTECT_CONTENT` | Protect forwarded or saved Telegram content |
| `TELEGRAM_LINK_PREVIEW_DISABLED` | Disable Telegram link previews |
| `WXPUSHER_URL` | Link attached to the WxPusher message |
| `WXPUSHER_CONTENT_TYPE` | `1` text, `2` HTML, `3` Markdown |
| `WXPUSHER_VERIFY_PAY_TYPE` | WxPusher paid-user filter |
| `CF_WORKERS_DAILY_REQUEST_LIMIT` | Alias for daily request limit |
| `CLOUDFLARE_WORKERS_DAILY_REQUEST_LIMIT` | Alias for daily request limit |

Disclaimer: This project is only an API forwarding tool. You are responsible for upstream API keys, provider terms, costs, and legal compliance.
This repository is indefinitely unmaintained.
