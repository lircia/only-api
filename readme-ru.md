# Only API

Only API это OpenAI-совместимый API-шлюз для Cloudflare Workers + Pages. Проект включает Worker-бэкенд, Pages-фронтенд, базу D1, вход пользователей, регистрацию, выдачу API Key, управление каналами, площадь моделей, статистику использования, мониторинг использования Workers, необязательные уведомления Telegram / WxPusher и необязательную аналитику Umami.

При прямом обращении к upstream API могут возникать высокая задержка или ошибки соединения, если его узлы находятся далеко или сетевой маршрут нестабилен. Only API перенаправляет запросы через Cloudflare и в некоторых случаях может улучшить качество соединения. Кроме того, несколько OpenAI-совместимых провайдеров можно объединить за одним API endpoint, чтобы клиенты обращались к моделям разных каналов по одному адресу.

Мы не предоставляем API Key и не предоставляем upstream API endpoint. Эта платформа предназначена только для API-перенаправления.

Для повышения скорости можно использовать сервис оптимизации домена Cloudflare или preferred-IP. Фронтенд не вызывает upstream-провайдеров напрямую, поэтому домен фронтенда обычно не нужно оптимизировать. Ссылки по такой оптимизации можно найти через веб-поиск.

Репозиторий рассчитан на хостинг в GitHub и развертывание через панель Cloudflare. `wrangler.toml` не используется.

## Языки

- [English](README.md)
- [中文](readme-zh.md)
- [日本語](readme-ja.md)
- [Deutsch](readme-de.md)
- [العربية](readme-ar.md)
- [Ελληνικά](readme-el.md)

## Пути проекта

| Назначение | Путь |
| --- | --- |
| Pages-фронтенд | `apps/web` |
| Worker-бэкенд | `apps/api/src/index.ts` |
| SQL-схема D1 | `apps/api/migrations/0001_initial.sql` |
| Файл зависимостей | `package.json` |

## Основные функции

- Первичная настройка супер-администратора через `ADMIN_SETUP_SECRET`.
- Режим личного использования и режим нескольких пользователей.
- Включение регистрации, проверка кодом по email, подтверждение пароля, проверка домена email и проверка цифрового префикса QQ email.
- Необязательный Cloudflare Turnstile. Frontend Site Key задается в переменной Pages, Backend Secret Key задается в переменной Worker.
- Пользовательские API Key используют префикс `oi-only-`.
- OpenAI-совместимое перенаправление `/v1/*`.
- Нет пользовательских лимитов.
- Проверка каналов и синхронизация моделей из upstream `/models`.
- Площадь моделей показывает одну модель в строке, позволяет менять отображаемое имя и скрывать модели.
- Статистика за 3 часа, 1 день, 7 дней, 15 дней и за все время.
- Страница Workers показывает процент использования и оставшийся процент.
- Использование Workers проверяется по умолчанию каждые 6 часов и может отправляться в Telegram или WxPusher.
- Необязательная аналитика Umami отдельно для Pages-фронтенда и Worker-бэкенда.
- Время во фронтенде отображается с поправкой UTC+8.
- Темы: черно-белая, светло-синяя с белым, желто-фиолетовая, зелено-красная и розово-оранжевая.
- Необязательное фоновое изображение фронтенда по URL.

## Развертывание 1: развернуть Worker

В Cloudflare Workers & Pages создайте или откройте Worker-проект и подключите этот GitHub-репозиторий.

Настройки сборки Worker:

| Настройка | Значение |
| --- | --- |
| Root directory | пусто или `/` |
| Build command | `npm ci` |
| Deploy command | `npx wrangler deploy apps/api/src/index.ts --name only-api-worker --compatibility-date 2024-12-01 --keep-vars` |

`--keep-vars` помогает сохранить переменные и секреты, заданные в панели Cloudflare. Если после обновления пропали переменные или привязка D1, убедитесь, что вы повторно развертываете тот же Worker, а не создаете новый Worker, затем снова проверьте страницу привязок Worker.

## Развертывание 2: создать базу D1

Создайте базу D1 в панели Cloudflare.

Рекомендуемое имя базы:

```txt
only_api
```

Имя привязки Worker обязательно должно быть:

```txt
DB
```

Откройте консоль D1 и выполните весь SQL из файла:

```txt
apps/api/migrations/0001_initial.sql
```

Создаваемые таблицы:

| Таблица | Назначение |
| --- | --- |
| `users` | Пользователи, администраторы и супер-администраторы |
| `email_verifications` | 13-значные коды проверки email |
| `sessions` | Сессии входа |
| `api_keys` | Пользовательские API Key |
| `channels` | Upstream API-каналы |
| `model_catalog` | Модели площади моделей |
| `usage_logs` | Записи использования API-перенаправления |
| `worker_usage_snapshots` | Снимки использования Workers |
| `system_settings` | Системные настройки |

## Развертывание 3: привязать ресурсы и переменные Worker

В настройках Worker привяжите D1:

| Тип | Имя | Значение |
| --- | --- | --- |
| D1 database | `DB` | ваша база D1 |

Обязательные переменные Worker:

| Имя | Тип | Назначение |
| --- | --- | --- |
| `APP_ORIGIN` | Переменная | URL Pages-фронтенда |
| `ADMIN_SETUP_SECRET` | Секрет | пароль для первичной настройки супер-администратора |
| `JWT_SECRET` | Секрет | длинная случайная строка для сессий |

Рекомендуемая переменная Worker:

| Имя | Тип | Назначение |
| --- | --- | --- |
| `API_PUBLIC_BASE_URL` | Переменная | публичный URL Worker, отображаемый во фронтенде |

Необязательные email-переменные:

| Имя | Тип | Назначение |
| --- | --- | --- |
| `RESEND_API_KEY` | Секрет | Resend API Key |
| `RESEND_FROM` | Переменная | отправитель, например `Only API <noreply@example.com>` |

Необязательная переменная Turnstile для Worker:

| Имя | Тип | Назначение |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | Секрет | Cloudflare Turnstile Secret Key |

Необязательные переменные использования Workers:

| Имя | Тип | Назначение |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | Переменная | Cloudflare Account ID |
| `CF_API_TOKEN` | Секрет | API Token с правом чтения использования Workers |
| `WORKERS_DAILY_REQUEST_LIMIT` | Переменная | дневной лимит запросов для расчета процента, по умолчанию `100000` |

Поддерживаются псевдонимы `CLOUDFLARE_ACCOUNT_ID`, `CF_ACCOUNT_TAG`, `CLOUDFLARE_ACCOUNT_TAG`, `CF_ZONE_ID`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN`, `CF_TOKEN` и `CLOUDFLARE_TOKEN`.

Необязательные переменные backend Umami:

| Имя | Тип | Назначение |
| --- | --- | --- |
| `UMAMI_BACKEND_ENABLED` | Переменная | установите `true`, чтобы включить статистику Worker-бэкенда |
| `UMAMI_BACKEND_HOST_URL` | Переменная | URL хоста Umami, например `https://cloud.umami.is` |
| `UMAMI_BACKEND_WEBSITE_ID` | Переменная | Umami Website ID для backend-статистики |
| `UMAMI_BACKEND_HOSTNAME` | Переменная | необязательное имя хоста в Umami, например `api.example.com` |

Backend Umami также можно настроить в системных настройках. Переменные Worker имеют приоритет над системными настройками.

Переменные уведомлений Telegram:

| Имя | Тип | Назначение |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Секрет | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Переменная | ID чата, группы или канала Telegram |

Переменные уведомлений WxPusher:

| Имя | Тип | Назначение |
| --- | --- | --- |
| `WXPUSHER_APP_TOKEN` | Секрет | WxPusher AppToken |
| `WXPUSHER_UIDS` | Переменная | список UID через запятую, обязателен без Topic ID |
| `WXPUSHER_TOPIC_IDS` | Переменная | список Topic ID через запятую, обязателен без UID |

Необязательный планировщик:

В панели Cloudflare можно добавить Worker Cron Trigger, например запуск раз в час. Приложение само выполняет запрос использования Workers только после достижения настроенного интервала. Интервал по умолчанию 360 минут.

## Развертывание 4: развернуть Pages-фронтенд

В Cloudflare Pages подключите тот же GitHub-репозиторий.

Настройки сборки Pages:

| Настройка | Значение |
| --- | --- |
| Framework preset | `React (Vite)` |
| Root directory | пусто или `/` |
| Build command | `npm ci && npm run build:web` |
| Build output directory | `apps/web/dist` |
| Node.js version | `20` или выше |

Обязательная переменная Pages:

```txt
VITE_API_BASE_URL=https://your-worker-domain.workers.dev
```

Необязательные переменные Pages:

```txt
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
VITE_BACKGROUND_IMAGE_URL=https://example.com/background.jpg
VITE_UMAMI_SCRIPT_URL=https://cloud.umami.is/script.js
VITE_UMAMI_WEBSITE_ID=your-frontend-umami-website-id
VITE_UMAMI_HOST_URL=https://cloud.umami.is
```

После развертывания Pages установите переменную Worker `APP_ORIGIN` равной URL Pages.

## Первая настройка

Откройте URL Pages-фронтенда. При первом посещении появится страница настройки.

Потребуется:

- `ADMIN_SETUP_SECRET`
- email супер-администратора
- пароль супер-администратора
- имя сайта
- режим личного использования или режим нескольких пользователей

После создания супер-администратора страница настройки закрывается, и секрет настройки больше не используется во frontend-процессе настройки.

## Проверка регистрации

Когда проверка email включена, регистрация отправляет 13-значный числовой код вместо ссылки.

- Код действителен 13 минут.
- Каждый код допускает 3 попытки ввода.
- Повторная отправка доступна через 67 секунд.
- В режиме личного использования проверка email по умолчанию отключена.
- В режиме нескольких пользователей проверка email по умолчанию включена.
- Проверка домена email и цифрового префикса QQ email включены по умолчанию.

## Аналитика Umami

Frontend Umami считает посещения Pages-консоли. Настройте его в системных настройках или используйте переменные Pages `VITE_UMAMI_SCRIPT_URL`, `VITE_UMAMI_WEBSITE_ID` и `VITE_UMAMI_HOST_URL`.

Backend Umami считает Worker-запросы как события `backend_request`. Настройте его в системных настройках или используйте переменные Worker `UMAMI_BACKEND_ENABLED`, `UMAMI_BACKEND_HOST_URL`, `UMAMI_BACKEND_WEBSITE_ID` и `UMAMI_BACKEND_HOSTNAME`.

Backend-статистика не отправляет email пользователя, API Key или тело запроса. Отправляются только категория маршрута, метод, статус-код и задержка.

## Использование Workers и уведомления

Мониторинг использования Workers требует переменные Cloudflare Account ID и API Token. Если их нет, фронтенд покажет сообщение о настройке.

Страница показывает:

- текущий процент использования
- текущий оставшийся процент
- дневной лимит запросов
- диапазон времени снимка

Процент считается как число Worker-запросов за последние 24 часа, разделенное на `WORKERS_DAILY_REQUEST_LIMIT`. Значение по умолчанию `100000`.

Автоматическая проверка по умолчанию выполняется каждые 6 часов. Нажатие «собрать сейчас» также сразу отправляет уведомление, если настроены переменные Telegram или WxPusher.

## Использование API

Client Base URL:

```txt
https://your-worker-domain.workers.dev/v1
```

Header:

```http
Authorization: Bearer oi-only-...
```

Рекомендуемые настройки SillyTavern:

```txt
API type: OpenAI Compatible / Custom OpenAI-compatible
API Base URL: https://your-worker-domain.workers.dev/v1
API Key: полный ключ oi-only-...
Model: имя модели, скопированное из площади моделей
```

## Channel Base URL

В канал нужно вводить корневой путь версии upstream API.

| Сервис | Channel Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| Другие совместимые сервисы | обычно `https://domain/v1` |

Бэкенд автоматически нормализует распространенные окончания, например `/v1`, `/v1/`, `/v1/chat` и `/v1/chat/completions`.

## Устранение неполадок

Если фронтенд не подключается к бэкенду:

1. Проверьте переменную Pages `VITE_API_BASE_URL`.
2. Убедитесь, что указан URL Worker, а не URL Pages.
3. После изменения переменных Pages разверните Pages заново.
4. Проверьте привязку Worker `DB`.
5. Проверьте переменные Worker `APP_ORIGIN`, `ADMIN_SETUP_SECRET` и `JWT_SECRET`.

Если SillyTavern показывает Unauthorized:

1. Используйте полный ключ, а не видимый префикс.
2. Используйте режим OpenAI Compatible или Custom OpenAI-compatible.
3. Убедитесь, что до и после ключа нет пробелов.
4. Убедитесь, что выбранное имя модели есть на площади моделей.

## Расширенные необязательные переменные

Эти переменные не нужны для обычного развертывания.

| Имя | Назначение |
| --- | --- |
| `TELEGRAM_PARSE_MODE` | `HTML`, `MarkdownV2` или `Markdown` |
| `TELEGRAM_MESSAGE_THREAD_ID` | Telegram forum topic thread ID |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | Telegram direct message topic ID |
| `TELEGRAM_DISABLE_NOTIFICATION` | тихое уведомление Telegram |
| `TELEGRAM_PROTECT_CONTENT` | защита Telegram-сообщения от пересылки или сохранения |
| `TELEGRAM_LINK_PREVIEW_DISABLED` | отключить предпросмотр ссылок Telegram |
| `WXPUSHER_URL` | ссылка в сообщении WxPusher |
| `WXPUSHER_CONTENT_TYPE` | `1` текст, `2` HTML, `3` Markdown |
| `WXPUSHER_VERIFY_PAY_TYPE` | фильтр платных пользователей WxPusher |
| `CF_WORKERS_DAILY_REQUEST_LIMIT` | псевдоним дневного лимита |
| `CLOUDFLARE_WORKERS_DAILY_REQUEST_LIMIT` | псевдоним дневного лимита |

Отказ от ответственности: этот проект является только инструментом API-перенаправления. Вы сами отвечаете за upstream API Key, правила провайдера, расходы и соблюдение закона.
Этот репозиторий бессрочно не поддерживается.
