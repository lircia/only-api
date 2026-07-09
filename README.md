# Only API

Only API is a Cloudflare Workers + Pages API gateway for OpenAI-compatible providers. It includes user login, registration, API keys, channel management, model discovery, usage statistics, admin settings, scheduled channel checks, Workers usage checks, and optional Telegram / WxPusher notifications.

The repository is designed for GitHub hosting and Cloudflare dashboard deployment. You do not need to edit `wrangler.toml`; this project does not use `wrangler.toml`.

## Languages

The default README is English. Other README files also include deployment steps:

- [中文](readme-zh.md)
- [日本語](readme-ja.md)
- [Deutsch](readme-de.md)
- [Русский](readme-ru.md)
- [العربية](readme-ar.md)
- [Ελληνικά](readme-el.md)

## Project Paths

| Purpose | Path | Notes |
| --- | --- | --- |
| Pages frontend | `apps/web` | Admin console, login, registration, usage pages |
| Worker backend | `apps/api/src/index.ts` | API, auth, forwarding, scheduled jobs |
| D1 schema SQL | `apps/api/migrations/0001_initial.sql` | Paste into the Cloudflare D1 console |
| Dependencies | `package.json` | Repository root |

## Features

- First visit setup with `ADMIN_SETUP_SECRET`.
- Super admin setup page disappears after the first super admin is created.
- Self-use mode and multi-user mode.
- Registration can be enabled or disabled.
- Email verification toggle:
  - Self-use mode defaults to off.
  - Multi-user mode defaults to on.
- Email code registration: 13-digit code, 13-minute validity, 3 attempts, and 67-second resend cooldown.
- Optional email-domain validation and numeric QQ email prefix enforcement, both enabled by default.
- Optional Cloudflare Turnstile verification.
- User API key creation and revocation.
- OpenAI-compatible `/v1/*` forwarding.
- No user quota enforcement.
- Channel settings, channel testing, model syncing from `/models`.
- Separate Model Square for copying, renaming, and hiding visible model names.
- Usage table for 3 hours, 1 day, 7 days, 15 days, and all-time summary.
- Workers usage checks with clear variable-missing feedback.
- Frontend time display is adjusted by UTC+8.

## Deployment Step 1: Deploy Worker

In Cloudflare Workers & Pages:

1. Create a Worker.
2. Connect your GitHub repository.
3. Use these build settings.

| Setting | Value |
| --- | --- |
| Root directory | blank or `/` |
| Build command | `npm ci` |
| Deploy command | `npx wrangler deploy apps/api/src/index.ts --name only-api-worker --compatibility-date 2024-12-01 --keep-vars` |

`--keep-vars` helps preserve variables and secrets that you set in the Cloudflare dashboard.

After deploying the Worker, continue with D1 and variable binding. If D1 bindings disappear after a redeploy, bind `DB -> your D1 database` again in the Worker settings.

## Deployment Step 2: Create D1

Create a D1 database in the Cloudflare dashboard.

Recommended name for new deployments:

```txt
only_api
```

If you used a different D1 database name, that is also fine. The code only requires the Worker binding name below:

```txt
DB
```

Open the D1 console and execute all SQL from:

```txt
apps/api/migrations/0001_initial.sql
```

Tables created:

| Table | Purpose |
| --- | --- |
| `users` | Users, admins, super admins |
| `email_verifications` | Email verification tokens |
| `sessions` | Login sessions |
| `api_keys` | User API keys |
| `channels` | Upstream provider channels |
| `model_catalog` | Synced models |
| `usage_logs` | Forwarding logs, status, latency, token usage |
| `worker_usage_snapshots` | Workers usage snapshots |
| `system_settings` | Site settings |

## Deployment Step 3: Bind Worker Resources

In Worker settings, bind:

| Type | Variable name | Value |
| --- | --- | --- |
| D1 database | `DB` | your D1 database |

Optional:

| Type | Variable name | Purpose |
| --- | --- | --- |
| KV namespace | `CACHE` | reserved cache binding |

Required variables or secrets:

| Name | Type | Notes |
| --- | --- | --- |
| `APP_ORIGIN` | Variable | Pages frontend URL, for example `https://xxx.pages.dev` |
| `ADMIN_SETUP_SECRET` | Secret | setup password for the first super admin |
| `JWT_SECRET` | Secret | long random string for sessions |

Recommended:

| Name | Type | Notes |
| --- | --- | --- |
| `API_PUBLIC_BASE_URL` | Variable | public Worker URL shown in the frontend |

Optional email verification:

| Name | Type | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Resend API key |
| `RESEND_FROM` | Variable | for example `Only API <noreply@example.com>` |

Optional Turnstile:

| Name | Type | Notes |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | Secret | Cloudflare Turnstile secret key |

Optional Workers usage check:

| Name | Type | Notes |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | Variable | Cloudflare account ID |
| `CF_API_TOKEN` | Secret | token that can read Workers usage |

If these Workers usage variables are missing, the dashboard will show a clear “please configure variables” message.

Notification variables:

Telegram required variables:

| Name | Type | Notes |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Variable | Telegram chat or group ID |

WxPusher required variables:

| Name | Type | Notes |
| --- | --- | --- |
| `WXPUSHER_APP_TOKEN` | Secret | WxPusher AppToken |
| `WXPUSHER_UIDS` | Variable | comma-separated WxPusher user IDs; required unless `WXPUSHER_TOPIC_IDS` is set |
| `WXPUSHER_TOPIC_IDS` | Variable | comma-separated WxPusher topic IDs; required unless `WXPUSHER_UIDS` is set |

## Deployment Step 4: Deploy Pages

In Cloudflare Pages:

| Setting | Value |
| --- | --- |
| Framework preset | `React (Vite)` |
| Root directory | blank or `/` |
| Build command | `npm ci && npm run build:web` |
| Build output directory | `apps/web/dist` |
| Node.js version | `20` or higher |

Required Pages environment variable:

```txt
VITE_API_BASE_URL=https://your-worker-domain.workers.dev
```

If you use a custom Worker domain:

```txt
VITE_API_BASE_URL=https://api.example.com
```

After Pages is deployed, set Worker variable `APP_ORIGIN` to your Pages URL.

## First Setup

Open your Pages frontend URL. The first visit shows the setup page.

You need:

- `ADMIN_SETUP_SECRET`
- super admin email
- super admin password
- site name
- self-use mode or multi-user mode

After setup:

- setup page disappears
- `ADMIN_SETUP_SECRET` is no longer used by the frontend setup flow
- later changes happen inside the admin dashboard

## Registration Verification

When email verification is enabled, registration no longer sends a verification link. It sends a 13-digit numeric code by email.

- The code is valid for 13 minutes.
- Each code allows 3 input attempts.
- The verification page includes a “resend” button.
- Resending is limited by a 67-second cooldown.
- The registration form includes a confirm-password field.
- Email suffix validation is enabled by default for common providers such as `qq.com`, `163.com`, `gmail.com`, `outlook.com`, `yeah.net`, `hotmail.com`, and `126.com`.
- QQ email addresses must use a numeric QQ-number prefix by default.
- Admins can disable email suffix validation and numeric QQ prefix enforcement in System Settings.

## Channel Base URL

Enter the upstream API base URL at the API version level.

Examples:

| Provider | Channel Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| Other OpenAI-compatible providers | usually `https://domain/v1` |

The backend normalizes common suffixes:

```txt
.../v1
.../v1/
.../v1/chat
.../v1/chat/completions
```

They are normalized to a usable API root before forwarding and model syncing.

## API Usage

Client Base URL:

```txt
https://your-worker-domain.workers.dev/v1
```

Header:

```http
Authorization: Bearer oi-only-...
```

New API keys use the `oi-only-` prefix. Older keys generated before this prefix change remain valid.

SillyTavern recommended settings:

```txt
API type: OpenAI Compatible / Custom OpenAI-compatible
API Base URL: https://your-worker-domain.workers.dev/v1
API Key: your full oi-only-... key
Model: copy a model name from Model Square
```

The backend accepts these key formats:

```txt
Authorization: Bearer oi-only-...
Authorization: oi-only-...
x-api-key: oi-only-...
api-key: oi-only-...
```

## Troubleshooting

If the frontend keeps loading:

1. Check Pages variable `VITE_API_BASE_URL`.
2. Make sure it points to the Worker URL, not the Pages URL.
3. Redeploy Pages after changing environment variables.
4. Check Worker D1 binding: `DB`.
5. Check Worker variables: `ADMIN_SETUP_SECRET`, `JWT_SECRET`, `APP_ORIGIN`.

If SillyTavern says Unauthorized:

1. Use the full API key, not the key prefix.
2. Select OpenAI Compatible / Custom OpenAI-compatible.
3. Do not use an official OpenRouter preset unless you want to bypass Only API.
4. Make sure there are no spaces before or after the key.

## Optional Local Commands

```bash
npm ci
npm run typecheck
npm run build:web
npm run deploy:api
```

## Advanced Optional Push Variables

These variables are not required for normal deployment. They are for users who already understand Telegram forum topics, message formatting, link previews, or WxPusher paid-topic behavior.

| Name | Type | Notes |
| --- | --- | --- |
| `TELEGRAM_PARSE_MODE` | Variable | `HTML`, `MarkdownV2`, or `Markdown` |
| `TELEGRAM_MESSAGE_THREAD_ID` | Variable | Telegram group forum topic thread ID |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | Variable | Telegram direct messages topic ID |
| `TELEGRAM_DISABLE_NOTIFICATION` | Variable | boolean, silent notification |
| `TELEGRAM_PROTECT_CONTENT` | Variable | boolean, protect forwarded/saved content |
| `TELEGRAM_LINK_PREVIEW_DISABLED` | Variable | boolean, disable link previews |
| `WXPUSHER_URL` | Variable | link attached to the message |
| `WXPUSHER_CONTENT_TYPE` | Variable | `1` text, `2` HTML, `3` Markdown; default `1` |
| `WXPUSHER_VERIFY_PAY_TYPE` | Variable | `0` no check, `1` paid users, `2` unpaid/expired users |

This repository is indefinitely unmaintained.
