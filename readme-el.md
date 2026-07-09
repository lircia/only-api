# Only API

Το Only API είναι ένα OpenAI-compatible API gateway για Cloudflare Workers και Pages. Περιλαμβάνει login, εγγραφή, email verification, API keys, channel management, Model Square, usage statistics, Workers usage checks και προαιρετικές ειδοποιήσεις Telegram / WxPusher.

Default English README: [README.md](README.md). Άλλες γλώσσες: [中文](readme-zh.md) | [日本語](readme-ja.md) | [Deutsch](readme-de.md) | [Русский](readme-ru.md) | [العربية](readme-ar.md)

## Project Paths

| Purpose | Path |
| --- | --- |
| Pages frontend | `apps/web` |
| Worker backend | `apps/api/src/index.ts` |
| D1 schema SQL | `apps/api/migrations/0001_initial.sql` |
| Dependencies | `package.json` |

## Features

- First setup creates the super admin with `ADMIN_SETUP_SECRET`.
- Self-use mode disables email verification by default. Multi-user mode enables it by default.
- New API keys use `oi-only-`. Older generated keys still work.
- `/v1/models` returns enabled model names from Model Square.
- Model Square supports custom display names, copy, and hide.
- Each channel has an individual test button. Tests sync upstream `/models`.
- Usage statistics show 3 hours, 1 day, 7 days, 15 days, and all-time.
- Telegram and WxPusher test messages are available in system settings.

## Deployment 1: Worker Backend

Create a Worker in Cloudflare Workers & Pages and connect your GitHub repository.

| Setting | Value |
| --- | --- |
| Root directory | blank or `/` |
| Build command | `npm ci` |
| Deploy command | `npx wrangler deploy apps/api/src/index.ts --name only-api-worker --compatibility-date 2024-12-01 --keep-vars` |

This project does not require `wrangler.toml`.

## Deployment 2: D1 Database

Create a D1 database. Recommended name:

```txt
only_api
```

If you already use a different D1 database name, you can keep it. The required Worker binding name is:

```txt
DB
```

Run all SQL from:

```txt
apps/api/migrations/0001_initial.sql
```

Tables:

| Table | Purpose |
| --- | --- |
| `users` | users and admins |
| `email_verifications` | email verification tokens |
| `sessions` | login sessions |
| `api_keys` | user API keys |
| `channels` | upstream channels |
| `model_catalog` | Model Square |
| `usage_logs` | request usage logs |
| `worker_usage_snapshots` | Workers usage snapshots |
| `system_settings` | system settings |

## Deployment 3: Worker Variables

Bind D1:

| Type | Name | Value |
| --- | --- | --- |
| D1 database | `DB` | your D1 database |

Required:

| Name | Type | Notes |
| --- | --- | --- |
| `APP_ORIGIN` | Variable | Pages frontend URL |
| `ADMIN_SETUP_SECRET` | Secret | first setup password |
| `JWT_SECRET` | Secret | long random string |

Recommended:

| Name | Type | Notes |
| --- | --- | --- |
| `API_PUBLIC_BASE_URL` | Variable | public Worker URL shown in frontend |

Optional:

| Name | Type | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Resend API key |
| `RESEND_FROM` | Variable | email sender |
| `TURNSTILE_SECRET_KEY` | Secret | Turnstile secret |
| `CF_ACCOUNT_ID` | Variable | Cloudflare account ID |
| `CF_API_TOKEN` | Secret | Workers usage token |

Notification required variables:

| Name | Type | Notes |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Variable | Telegram chat ID |
| `WXPUSHER_APP_TOKEN` | Secret | WxPusher AppToken |
| `WXPUSHER_UIDS` | Variable | comma-separated WxPusher UIDs; required unless `WXPUSHER_TOPIC_IDS` is set |
| `WXPUSHER_TOPIC_IDS` | Variable | comma-separated WxPusher topic IDs; required unless `WXPUSHER_UIDS` is set |

## Deployment 4: Pages Frontend

Create a Pages project from the same GitHub repository.

| Setting | Value |
| --- | --- |
| Framework preset | `React (Vite)` |
| Root directory | blank or `/` |
| Build command | `npm ci && npm run build:web` |
| Build output directory | `apps/web/dist` |
| Node.js version | `20` or newer |

Required Pages variable:

```txt
VITE_API_BASE_URL=https://your-worker-domain
```

After Pages is deployed, set Worker variable `APP_ORIGIN` to the Pages URL.

## First Setup and API Usage

Open the Pages URL and create the super admin with `ADMIN_SETUP_SECRET`.

Client Base URL:

```txt
https://your-worker-domain/v1
```

Header:

```http
Authorization: Bearer oi-only-...
```

SillyTavern:

```txt
API type: OpenAI Compatible / Custom OpenAI-compatible
API Base URL: https://your-worker-domain/v1
API Key: full oi-only-... key
Model: copy from Model Square
```

Channel Base URL examples:

| Provider | Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |

## Advanced Optional Push Variables

These variables are not required for normal deployment. They are for users who already understand Telegram topics, message formatting, link previews, or WxPusher paid-topic behavior.

| Name | Type | Notes |
| --- | --- | --- |
| `TELEGRAM_PARSE_MODE` | Variable | `HTML`, `MarkdownV2`, or `Markdown` |
| `TELEGRAM_MESSAGE_THREAD_ID` | Variable | Telegram forum topic thread ID |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | Variable | Telegram direct messages topic ID |
| `TELEGRAM_DISABLE_NOTIFICATION` | Variable | boolean, silent notification |
| `TELEGRAM_PROTECT_CONTENT` | Variable | boolean, protect content |
| `TELEGRAM_LINK_PREVIEW_DISABLED` | Variable | boolean, disable link previews |
| `WXPUSHER_URL` | Variable | message link |
| `WXPUSHER_CONTENT_TYPE` | Variable | `1` text, `2` HTML, `3` Markdown; default `1` |
| `WXPUSHER_VERIFY_PAY_TYPE` | Variable | `0` no check, `1` paid users, `2` unpaid/expired users |

Αυτό το αποθετήριο δεν θα συντηρείται επ' αόριστον.
