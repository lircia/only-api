# Only API

Only API ist ein OpenAI-kompatibles API-Gateway für Cloudflare Workers und Pages. Es enthält Anmeldung, Registrierung, E-Mail-Verifizierung, API Keys, Kanalverwaltung, Modellplatz, Nutzungsstatistiken, Workers-Nutzungsprüfung sowie optionale Telegram- und WxPusher-Benachrichtigungen.

Die englische Standarddokumentation befindet sich in [README.md](README.md). Weitere Sprachen: [Chinesisch](readme-zh.md) | [Japanisch](readme-ja.md) | [Russisch](readme-ru.md) | [Arabisch](readme-ar.md) | [Griechisch](readme-el.md)

## Projektstruktur

| Zweck | Pfad |
| --- | --- |
| Pages-Frontend | `apps/web` |
| Worker-Backend | `apps/api/src/index.ts` |
| D1-Schema-SQL | `apps/api/migrations/0001_initial.sql` |
| Abhängigkeiten und Skripte | `package.json` |

## Funktionen

- Die Ersteinrichtung erstellt mit `ADMIN_SETUP_SECRET` einen Superadministrator.
- Im Eigenmodus ist E-Mail-Verifizierung standardmäßig deaktiviert. Im Mehrbenutzermodus ist sie standardmäßig aktiviert.
- Neue API Keys verwenden `oi-only-`. Früher erstellte Keys bleiben gültig.
- `/v1/models` gibt die im Modellplatz aktivierten Modellnamen zurück.
- Im Modellplatz können Anzeigenamen bearbeitet, kopiert und ausgeblendet werden.
- Jeder Kanal hat eine eigene Testschaltfläche. Beim Test werden Modelle über `/models` synchronisiert.
- Die Nutzungsstatistik zeigt 3 Stunden, 1 Tag, 7 Tage, 15 Tage und Gesamtwerte.
- In den Systemeinstellungen können Telegram- und WxPusher-Testnachrichten gesendet werden.

## Bereitstellung 1: Worker-Backend

Erstelle in Cloudflare Workers & Pages einen Worker und verbinde dieses GitHub-Repository.

| Einstellung | Wert |
| --- | --- |
| Stammverzeichnis | leer lassen oder `/` |
| Build-Befehl | `npm ci` |
| Bereitstellungsbefehl | `npx wrangler deploy apps/api/src/index.ts --name only-api-worker --compatibility-date 2024-12-01 --keep-vars` |

Dieses Projekt benötigt keine `wrangler.toml`.

## Bereitstellung 2: D1-Datenbank

Erstelle eine D1-Datenbank. Empfohlener Name für neue Installationen:

```txt
only_api
```

Ein anderer D1-Datenbankname ist ebenfalls möglich. Wichtig ist nur der Worker-Bindungsname:

```txt
DB
```

Führe in der D1-Konsole den gesamten Inhalt dieser SQL-Datei aus:

```txt
apps/api/migrations/0001_initial.sql
```

Erstellte Tabellen:

| Tabelle | Zweck |
| --- | --- |
| `users` | Benutzer und Administratoren |
| `email_verifications` | E-Mail-Verifizierungstoken |
| `sessions` | Anmeldesitzungen |
| `api_keys` | Benutzer-API-Keys |
| `channels` | Upstream-Kanäle |
| `model_catalog` | Modellplatz |
| `usage_logs` | Nutzungsprotokolle |
| `worker_usage_snapshots` | Workers-Nutzungsschnappschüsse |
| `system_settings` | Systemeinstellungen |

## Bereitstellung 3: Worker-Bindings und Variablen

Binde D1 in den Worker-Einstellungen.

| Typ | Name | Wert |
| --- | --- | --- |
| D1-Datenbank | `DB` | deine D1-Datenbank |

Pflichtvariablen:

| Name | Typ | Hinweis |
| --- | --- | --- |
| `APP_ORIGIN` | Variable | URL des Pages-Frontends |
| `ADMIN_SETUP_SECRET` | Secret | Admin-Schlüssel für die Ersteinrichtung |
| `JWT_SECRET` | Secret | lange zufällige Zeichenfolge |

Empfohlene Variable:

| Name | Typ | Hinweis |
| --- | --- | --- |
| `API_PUBLIC_BASE_URL` | Variable | öffentliche Worker-URL, die im Frontend angezeigt wird |

Optionale Variablen:

| Name | Typ | Hinweis |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Resend API Key |
| `RESEND_FROM` | Variable | Absenderadresse für E-Mails |
| `TURNSTILE_SECRET_KEY` | Secret | Turnstile Secret Key |
| `CF_ACCOUNT_ID` | Variable | Cloudflare-Konto-ID |
| `CF_API_TOKEN` | Secret | Token zum Lesen der Workers-Nutzung |

Notwendige Variablen für Benachrichtigungen:

| Name | Typ | Hinweis |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram Bot Token |
| `TELEGRAM_CHAT_ID` | Variable | Telegram Chat- oder Gruppen-ID |
| `WXPUSHER_APP_TOKEN` | Secret | WxPusher AppToken |
| `WXPUSHER_UIDS` | Variable | WxPusher UIDs; erforderlich, wenn `WXPUSHER_TOPIC_IDS` nicht gesetzt ist |
| `WXPUSHER_TOPIC_IDS` | Variable | WxPusher Topic IDs; erforderlich, wenn `WXPUSHER_UIDS` nicht gesetzt ist |

## Bereitstellung 4: Pages-Frontend

Erstelle ein Cloudflare-Pages-Projekt aus demselben GitHub-Repository.

| Einstellung | Wert |
| --- | --- |
| Framework-Vorgabe | `React (Vite)` |
| Stammverzeichnis | leer lassen oder `/` |
| Build-Befehl | `npm ci && npm run build:web` |
| Build-Ausgabeverzeichnis | `apps/web/dist` |
| Node.js-Version | `20` oder höher |

Erforderliche Pages-Variable:

```txt
VITE_API_BASE_URL=https://your-worker-domain
```

Nach der Pages-Bereitstellung setze die Worker-Variable `APP_ORIGIN` auf die Pages-URL.

## Ersteinrichtung und API-Nutzung

Öffne die Pages-URL und gib `ADMIN_SETUP_SECRET`, E-Mail, Passwort, Seitennamen sowie Eigenmodus oder Mehrbenutzermodus ein.

Client-Basis-URL:

```txt
https://your-worker-domain/v1
```

Anfragekopf:

```http
Authorization: Bearer oi-only-...
```

Empfohlene SillyTavern-Einstellungen:

```txt
API type: OpenAI Compatible / Custom OpenAI-compatible
API Base URL: https://your-worker-domain/v1
API Key: vollständiger oi-only-... key
Model: aus dem Modellplatz kopieren
```

Beispiele für Kanal-Base-URLs:

| Anbieter | Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |

## Erweiterte optionale Push-Variablen

Diese Variablen sind für eine normale Bereitstellung nicht erforderlich. Sie sind für Benutzer gedacht, die Telegram-Themen, Nachrichtenformatierung, Linkvorschauen oder das Verhalten bezahlter WxPusher-Themen kennen.

| Name | Typ | Hinweis |
| --- | --- | --- |
| `TELEGRAM_PARSE_MODE` | Variable | `HTML`, `MarkdownV2` oder `Markdown` |
| `TELEGRAM_MESSAGE_THREAD_ID` | Variable | Telegram-Forum-Thread-ID |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | Variable | Telegram Direct-Messages-Topic-ID |
| `TELEGRAM_DISABLE_NOTIFICATION` | Variable | boolescher Wert, stille Benachrichtigung |
| `TELEGRAM_PROTECT_CONTENT` | Variable | boolescher Wert, Inhalt vor Weiterleitung oder Speichern schützen |
| `TELEGRAM_LINK_PREVIEW_DISABLED` | Variable | boolescher Wert, Linkvorschau deaktivieren |
| `WXPUSHER_URL` | Variable | Link in der Nachricht |
| `WXPUSHER_CONTENT_TYPE` | Variable | `1` Text, `2` HTML, `3` Markdown; Standardwert `1` |
| `WXPUSHER_VERIFY_PAY_TYPE` | Variable | `0` keine Prüfung, `1` nur zahlende Benutzer, `2` nicht abonnierte oder abgelaufene Benutzer |

Dieses Repository wird auf unbestimmte Zeit nicht gewartet.
