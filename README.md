# Only API

Only API is a Cloudflare Workers + Pages API gateway for OpenAI-compatible APIs. It provides a Worker backend, a Pages frontend, D1 storage, user login, registration, API key distribution, channel management, a Model Square, usage statistics, Workers usage monitoring, and optional Telegram / WxPusher notifications.

Direct calls to an upstream API can suffer from high latency or connection failures when its service nodes are far away or the network route is unstable. Only API forwards requests through Cloudflare and may improve connectivity in these situations. It can also combine multiple OpenAI-compatible providers behind one API endpoint, so clients can use one address to access models from different channels.

We do not provide any API key or upstream API endpoint. This platform is only for API forwarding.

You may use a Cloudflare domain preferred-route or preferred-IP service to improve speed. The frontend does not call upstream providers directly, so the frontend domain usually does not need optimization. You can find optimization links through web search.

This repository is designed for GitHub hosting and Cloudflare dashboard deployment. It does not use `wrangler.toml`.

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
| D1 schema SQL | `apps/api/migrations/0001_initial.sql` |
| Root dependency file | `package.json` |

## Main Features

- First super-admin setup with `ADMIN_SETUP_SECRET`.
- Self-use mode and multi-user mode.
- Registration switch, email-code verification, confirm password, email suffix validation, and numeric QQ email prefix validation.
- Optional Cloudflare Turnstile. The frontend Site Key is a Pages variable, and the backend Secret Key is a Worker variable.
- User API keys use the `oi-only-` prefix.
- OpenAI-compatible `/v1/*` forwarding.
- No user quota enforcement.
- Channel testing and model syncing from upstream `/models`.
- Model Square with one model per row, editable display names, and hidden models.
- Usage statistics for 3 hours, 1 day, 7 days, 15 days, and all time.
- Workers usage monitoring shows used percent and remaining percent.
- Workers usage is checked every 6 hours by default and can be pushed to Telegram or WxPusher.
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
| Deploy command | `npx wrangler deploy apps/api/src/index.ts --name only-api-worker --compatibility-date 2024-12-01 --keep-vars` |

`--keep-vars` helps preserve Worker variables and secrets. If your variables or D1 binding disappear after an update, make sure you are redeploying the same Worker, not creating a new Worker, then recheck the Worker bindings page.

## Deployment 2: Create D1 Database

Create a D1 database in the Cloudflare dashboard.

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

Bind the D1 database in Worker settings:

| Type | Name | Value |
| --- | --- | --- |
| D1 database | `DB` | your D1 database |

Required Worker variables:

| Name | Type | Purpose |
| --- | --- | --- |
| `APP_ORIGIN` | Variable | Your Pages frontend URL |
| `ADMIN_SETUP_SECRET` | Secret | Password for first super-admin setup |
| `JWT_SECRET` | Secret | Long random session secret |

Recommended Worker variable:

| Name | Type | Purpose |
| --- | --- | --- |
| `API_PUBLIC_BASE_URL` | Variable | Public Worker URL shown in the frontend |

Optional email variables:

| Name | Type | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Resend API key |
| `RESEND_FROM` | Variable | Sender, for example `Only API <noreply@example.com>` |

Optional Turnstile Worker variable:

| Name | Type | Purpose |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | Secret | Cloudflare Turnstile Secret Key |

Optional Workers usage variables:

| Name | Type | Purpose |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | Variable | Cloudflare account ID |
| `CF_API_TOKEN` | Secret | API token with permission to read Workers usage |
| `WORKERS_DAILY_REQUEST_LIMIT` | Variable | Daily request limit used for percent calculation, default `100000` |

Accepted aliases are `CLOUDFLARE_ACCOUNT_ID`, `CF_ACCOUNT_TAG`, `CLOUDFLARE_ACCOUNT_TAG`, `CF_ZONE_ID`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN`, `CF_TOKEN`, and `CLOUDFLARE_TOKEN`.

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

Optional scheduled trigger:

Add a Worker Cron Trigger in the Cloudflare dashboard. For example, run every hour. The app itself only performs the Workers usage query when the configured interval has passed. The default interval is 360 minutes.

## Deployment 4: Deploy Pages Frontend

In Cloudflare Pages, connect the same GitHub repository.

Use these Pages build settings:

| Setting | Value |
| --- | --- |
| Framework preset | `React (Vite)` |
| Root directory | blank or `/` |
| Build command | `npm ci && npm run build:web` |
| Build output directory | `apps/web/dist` |
| Node.js version | `20` or higher |

Required Pages variable:

```txt
VITE_API_BASE_URL=https://your-worker-domain.workers.dev
```

Optional Pages variables:

```txt
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
VITE_BACKGROUND_IMAGE_URL=https://example.com/background.jpg
```

After Pages is deployed, set Worker variable `APP_ORIGIN` to the Pages URL.

## First Setup

Open the Pages frontend URL. The first visit shows the setup page.

You need:

- `ADMIN_SETUP_SECRET`
- super-admin email
- super-admin password
- site name
- self-use mode or multi-user mode

After the super admin is created, the setup page closes and the setup secret is no longer used by the frontend setup flow.

## Registration Verification

When email verification is enabled, registration sends a 13-digit numeric code by email instead of a link.

- The code is valid for 13 minutes.
- Each code allows 3 attempts.
- Resend cooldown is 67 seconds.
- Self-use mode defaults email verification to off.
- Multi-user mode defaults email verification to on.
- Email suffix validation and numeric QQ email prefix validation are enabled by default.

## Workers Usage And Notifications

Workers usage monitoring requires the Cloudflare account ID and API token variables. If they are missing, the frontend shows a configuration message.

The page displays:

- current used percent
- current remaining percent
- daily request limit
- snapshot time range

The percent is calculated from the last 24 hours of Worker requests divided by `WORKERS_DAILY_REQUEST_LIMIT`. The default limit is `100000`.

Automatic checks default to every 6 hours. Clicking “collect now” also sends a notification immediately if Telegram or WxPusher variables are configured.

## API Usage

Client Base URL:

```txt
https://your-worker-domain.workers.dev/v1
```

Header:

```http
Authorization: Bearer oi-only-...
```

SillyTavern recommended settings:

```txt
API type: OpenAI Compatible / Custom OpenAI-compatible
API Base URL: https://your-worker-domain.workers.dev/v1
API Key: your full oi-only-... key
Model: copy a model name from Model Square
```

## Channel Base URL

Use the upstream API root at the version level.

| Provider | Channel Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| Other compatible providers | usually `https://domain/v1` |

The backend normalizes common suffixes such as `/v1`, `/v1/`, `/v1/chat`, and `/v1/chat/completions`.

## Troubleshooting

If the frontend cannot connect:

1. Check Pages variable `VITE_API_BASE_URL`.
2. Make sure it points to the Worker URL, not the Pages URL.
3. Redeploy Pages after changing Pages variables.
4. Check Worker binding `DB`.
5. Check Worker variables `APP_ORIGIN`, `ADMIN_SETUP_SECRET`, and `JWT_SECRET`.

If SillyTavern says Unauthorized:

1. Use the full key, not the visible key prefix.
2. Use OpenAI Compatible or Custom OpenAI-compatible mode.
3. Make sure there are no spaces before or after the key.
4. Confirm the selected model name exists in Model Square.

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
