# Only API

Only API ist ein OpenAI-compatible API-Gateway für Cloudflare Workers und Pages. Es enthält Login, Registrierung, E-Mail-Verifizierung, API Keys, Channel-Verwaltung, Model Square, Nutzungsstatistiken, Workers-Usage-Prüfung und optionale Telegram / WxPusher Benachrichtigungen.

Default English README: [README.md](README.md). Andere Sprachen: [中文](readme-zh.md) | [日本語](readme-ja.md) | [Русский](readme-ru.md) | [العربية](readme-ar.md) | [Ελληνικά](readme-el.md)

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
- Model Square supports custom display names and hiding models.
- Every channel has an individual test button. Tests sync upstream `/models`.
- Usage statistics show 3 hours, 1 day, 7 days, 15 days, and all-time.
- System settings include Telegram and WxPusher test messages.

## Deployment 1: Worker Backend

Create a Worker in Cloudflare Workers & Pages and connect your GitHub repository.

| Setting | Value |
| --- | --- |
| Root directory | blank or `/` |
| Build command | `npm ci` |
| Deploy command | `npx wrangler deploy apps/api/src/index.ts --name only-api-worker --compatibility-date 2024-12-01 --keep-vars` |

No `wrangler.toml` is required.

## Deployment 2: D1 Database

Create a D1 database. Recommended name:

```txt
only_api
```

If your existing D1 database uses a different name, you can keep it. The Worker binding must be:

```txt
DB
```

Run all SQL from this file in the D1 console:

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

## Deployment 3: Bindings and Variables

Bind D1 in Worker settings:

| Type | Name | Value |
| --- | --- | --- |
| D1 database | `DB` | your D1 database |

Required variables:

| Name | Type | Notes |
| --- | --- | --- |
| `APP_ORIGIN` | Variable | Pages frontend URL |
| `ADMIN_SETUP_SECRET` | Secret | first setup password |
| `JWT_SECRET` | Secret | long random string |

Recommended:

| Name | Type | Notes |
| --- | --- | --- |
| `API_PUBLIC_BASE_URL` | Variable | public Worker URL shown in frontend |

Optional variables:

| Name | Type | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Resend API key |
| `RESEND_FROM` | Variable | email sender |
| `TURNSTILE_SECRET_KEY` | Secret | Turnstile secret |
| `CF_ACCOUNT_ID` | Variable | Cloudflare account ID |
| `CF_API_TOKEN` | Secret | Workers usage token |
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Variable | Telegram chat ID |
| `WXPUSHER_APP_TOKEN` | Secret | WxPusher AppToken |
| `WXPUSHER_UIDS` | Variable | comma-separated WxPusher UIDs |

## Deployment 4: Pages Frontend

Create a Cloudflare Pages project from the same repository.

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

Open the Pages URL and create the super admin. After that, the setup page is closed.

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
