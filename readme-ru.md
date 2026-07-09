# Only API

Only API - это OpenAI-совместимый API-шлюз для Cloudflare Workers и Pages. Проект включает вход, регистрацию, проверку электронной почты, API Keys, управление каналами, витрину моделей, статистику использования, проверку использования Workers и необязательные уведомления Telegram / WxPusher.

Основная английская документация находится в [README.md](README.md). Другие языки: [китайский](readme-zh.md) | [японский](readme-ja.md) | [немецкий](readme-de.md) | [арабский](readme-ar.md) | [греческий](readme-el.md)

## Структура проекта

| Назначение | Путь |
| --- | --- |
| Фронтенд Pages | `apps/web` |
| Бэкенд Worker | `apps/api/src/index.ts` |
| SQL-схема D1 | `apps/api/migrations/0001_initial.sql` |
| Зависимости и скрипты | `package.json` |

## Возможности

- Первичная настройка создает супер-администратора с помощью `ADMIN_SETUP_SECRET`.
- В режиме личного использования проверка email по умолчанию выключена. В многопользовательском режиме она включена по умолчанию.
- Новые API Keys используют префикс `oi-only-`. Ранее созданные ключи продолжают работать.
- `/v1/models` возвращает включенные имена моделей из витрины моделей.
- В витрине моделей можно менять отображаемые имена, копировать и скрывать модели.
- У каждого канала есть отдельная кнопка теста. При тесте синхронизируется upstream `/models`.
- Статистика показывает 3 часа, 1 день, 7 дней, 15 дней и общий итог.
- В системных настройках можно отправить тестовые уведомления Telegram и WxPusher.

## Развертывание 1: бэкенд Worker

Создайте Worker в Cloudflare Workers & Pages и подключите этот GitHub-репозиторий.

| Настройка | Значение |
| --- | --- |
| Корневой каталог | пусто или `/` |
| Команда сборки | `npm ci` |
| Команда развертывания | `npx wrangler deploy apps/api/src/index.ts --name only-api-worker --compatibility-date 2024-12-01 --keep-vars` |

Файл `wrangler.toml` для этого проекта не нужен.

## Развертывание 2: база данных D1

Создайте базу данных D1. Рекомендуемое имя для новой установки:

```txt
only_api
```

Можно использовать и другое имя базы D1. Важно, чтобы привязка Worker называлась:

```txt
DB
```

В консоли D1 выполните весь SQL из файла:

```txt
apps/api/migrations/0001_initial.sql
```

Будут созданы таблицы:

| Таблица | Назначение |
| --- | --- |
| `users` | пользователи и администраторы |
| `email_verifications` | токены проверки email |
| `sessions` | сеансы входа |
| `api_keys` | API Keys пользователей |
| `channels` | upstream-каналы |
| `model_catalog` | витрина моделей |
| `usage_logs` | журналы использования запросов |
| `worker_usage_snapshots` | снимки использования Workers |
| `system_settings` | системные настройки |

## Развертывание 3: привязки и переменные Worker

Привяжите D1 в настройках Worker.

| Тип | Имя | Значение |
| --- | --- | --- |
| D1 database | `DB` | ваша база D1 |

Обязательные переменные:

| Имя | Тип | Примечание |
| --- | --- | --- |
| `APP_ORIGIN` | Variable | URL фронтенда Pages |
| `ADMIN_SETUP_SECRET` | Secret | ключ администратора для первичной настройки |
| `JWT_SECRET` | Secret | длинная случайная строка |

Рекомендуемая переменная:

| Имя | Тип | Примечание |
| --- | --- | --- |
| `API_PUBLIC_BASE_URL` | Variable | публичный URL Worker, показываемый во фронтенде |

Необязательные переменные:

| Имя | Тип | Примечание |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Resend API Key |
| `RESEND_FROM` | Variable | отправитель email |
| `TURNSTILE_SECRET_KEY` | Secret | Turnstile Secret Key |
| `CF_ACCOUNT_ID` | Variable | идентификатор аккаунта Cloudflare |
| `CF_API_TOKEN` | Secret | Token для чтения использования Workers |

Переменные, необходимые для уведомлений:

| Имя | Тип | Примечание |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram Bot Token |
| `TELEGRAM_CHAT_ID` | Variable | ID чата или группы Telegram |
| `WXPUSHER_APP_TOKEN` | Secret | WxPusher AppToken |
| `WXPUSHER_UIDS` | Variable | WxPusher UIDs; обязательно, если не задан `WXPUSHER_TOPIC_IDS` |
| `WXPUSHER_TOPIC_IDS` | Variable | WxPusher Topic IDs; обязательно, если не задан `WXPUSHER_UIDS` |

## Развертывание 4: фронтенд Pages

Создайте проект Cloudflare Pages из того же GitHub-репозитория.

| Настройка | Значение |
| --- | --- |
| Пресет фреймворка | `React (Vite)` |
| Корневой каталог | пусто или `/` |
| Команда сборки | `npm ci && npm run build:web` |
| Каталог результата сборки | `apps/web/dist` |
| Версия Node.js | `20` или выше |

Обязательная переменная Pages:

```txt
VITE_API_BASE_URL=https://your-worker-domain
```

После развертывания Pages установите переменную Worker `APP_ORIGIN` в URL Pages.

## Первичная настройка и использование API

Откройте URL Pages и введите `ADMIN_SETUP_SECRET`, email, пароль, название сайта, а также выберите личный или многопользовательский режим.

Базовый URL клиента:

```txt
https://your-worker-domain/v1
```

Заголовок:

```http
Authorization: Bearer oi-only-...
```

Рекомендуемые настройки SillyTavern:

```txt
API type: OpenAI Compatible / Custom OpenAI-compatible
API Base URL: https://your-worker-domain/v1
API Key: полный oi-only-... key
Model: скопировать из витрины моделей
```

Примеры Base URL каналов:

| Провайдер | Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |

## Расширенные необязательные переменные push-уведомлений

Эти переменные не нужны для обычного развертывания. Они предназначены для пользователей, которые понимают темы Telegram, форматирование сообщений, предпросмотр ссылок или поведение платных тем WxPusher.

| Имя | Тип | Примечание |
| --- | --- | --- |
| `TELEGRAM_PARSE_MODE` | Variable | `HTML`, `MarkdownV2` или `Markdown` |
| `TELEGRAM_MESSAGE_THREAD_ID` | Variable | Thread ID темы форума Telegram |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | Variable | Telegram Direct Messages Topic ID |
| `TELEGRAM_DISABLE_NOTIFICATION` | Variable | логическое значение, тихое уведомление |
| `TELEGRAM_PROTECT_CONTENT` | Variable | логическое значение, защита от пересылки или сохранения |
| `TELEGRAM_LINK_PREVIEW_DISABLED` | Variable | логическое значение, отключить предпросмотр ссылок |
| `WXPUSHER_URL` | Variable | ссылка в сообщении |
| `WXPUSHER_CONTENT_TYPE` | Variable | `1` текст, `2` HTML, `3` Markdown; значение по умолчанию `1` |
| `WXPUSHER_VERIFY_PAY_TYPE` | Variable | `0` без проверки, `1` только платные пользователи, `2` пользователи без подписки или с истекшей подпиской |

Этот репозиторий бессрочно не поддерживается.
