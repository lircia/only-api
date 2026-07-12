# Only API

Only API ist ein OpenAI-kompatibles API-Gateway für Cloudflare Workers + Pages. Es enthält ein Worker-Backend, ein Pages-Frontend, D1-Speicher, Benutzeranmeldung, Registrierung, API-Key-Ausgabe, Kanalverwaltung, einen Modellplatz, Nutzungsstatistiken, Workers-Nutzungsüberwachung, optionale Telegram- oder WxPusher-Benachrichtigungen und optionale Umami-Analytik.

Direkte Aufrufe einer Upstream-API können hohe Latenz oder Verbindungsfehler verursachen, wenn deren Dienstknoten weit entfernt oder die Netzwerkroute instabil ist. Only API leitet Anfragen über Cloudflare weiter und kann die Verbindung in solchen Situationen verbessern. Außerdem können mehrere OpenAI-kompatible Anbieter hinter einem einzigen API-Endpunkt gebündelt werden, sodass Clients Modelle verschiedener Kanäle über eine Adresse erreichen.

Wir stellen keine API Keys und keine Upstream-API-Endpunkte bereit. Diese Plattform dient nur zur API-Weiterleitung.

Du kannst einen Cloudflare-Domain-Optimierungsdienst oder Preferred-IP-Dienst verwenden, um die Geschwindigkeit zu verbessern. Das Frontend ruft keine Upstream-Anbieter direkt auf, daher muss die Frontend-Domain normalerweise nicht optimiert werden. Links zu solchen Optimierungen kannst du über eine Websuche finden.

Dieses Repository ist für GitHub-Hosting und Deployment über das Cloudflare-Dashboard gedacht. Es verwendet keine `wrangler.toml`.

## Sprachen

- [English](README.md)
- [中文](readme-zh.md)
- [日本語](readme-ja.md)
- [Русский](readme-ru.md)
- [العربية](readme-ar.md)
- [Ελληνικά](readme-el.md)

## Projektpfade

| Zweck | Pfad |
| --- | --- |
| Pages-Frontend | `apps/web` |
| Worker-Backend | `apps/api/src/index.ts` |
| D1-Schema-SQL | `apps/api/migrations/0001_initial.sql` |
| Abhängigkeiten | `package.json` |

## Hauptfunktionen

- Erste Super-Admin-Einrichtung mit `ADMIN_SETUP_SECRET`.
- Selbstnutzungsmodus und Mehrbenutzermodus.
- Registrierungsschalter, E-Mail-Code-Verifizierung, Passwortbestätigung, E-Mail-Domain-Prüfung und numerische QQ-Mail-Präfixprüfung.
- Optionales Cloudflare Turnstile. Der Frontend Site Key gehört in eine Pages-Variable, der Backend Secret Key in eine Worker-Variable.
- Benutzer-API-Keys verwenden das Präfix `oi-only-`.
- OpenAI-kompatible Weiterleitung für `/v1/*`.
- Keine Benutzerkontingente.
- Kanaltests und Modellsynchronisierung über Upstream `/models`.
- Modellplatz mit einem Modell pro Zeile, editierbaren Anzeigenamen und ausblendbaren Modellen.
- Nutzungsstatistiken für 3 Stunden, 1 Tag, 7 Tage, 15 Tage und Gesamtansicht.
- Workers-Nutzung zeigt verwendeten Prozentsatz und verbleibenden Prozentsatz.
- Workers-Nutzung wird standardmäßig alle 6 Stunden abgefragt und kann an Telegram oder WxPusher gesendet werden.
- Optionale Umami-Analytik getrennt für Pages-Frontend und Worker-Backend.
- Zeitangaben im Frontend werden auf UTC+8 angepasst.
- Eingebaute Themes: Schwarz-Weiß, helles Blau-Weiß, Gelb-Lila, Grün-Rot und Pink-Orange.
- Optionales Frontend-Hintergrundbild per URL.

## Deployment 1: Worker bereitstellen

Erstelle oder öffne in Cloudflare Workers & Pages ein Worker-Projekt und verbinde dieses GitHub-Repository.

Worker-Build-Einstellungen:

| Einstellung | Wert |
| --- | --- |
| Root directory | leer oder `/` |
| Build command | `npm ci` |
| Deploy command | `npx wrangler deploy apps/api/src/index.ts --name only-api-worker --compatibility-date 2024-12-01 --keep-vars` |

`--keep-vars` hilft, Variablen und Secrets aus dem Cloudflare-Dashboard zu behalten. Wenn Variablen oder die D1-Bindung nach einem Update verschwinden, prüfe, ob du denselben Worker neu bereitstellst und nicht einen neuen Worker erstellst. Prüfe danach die Worker-Bindings erneut.

## Deployment 2: D1-Datenbank erstellen

Erstelle im Cloudflare-Dashboard eine D1-Datenbank.

Empfohlener Datenbankname:

```txt
only_api
```

Der Worker-Bindungsname muss lauten:

```txt
DB
```

Öffne die D1-Konsole und führe die gesamte SQL-Datei aus:

```txt
apps/api/migrations/0001_initial.sql
```

Diese Tabellen werden erstellt:

| Tabelle | Zweck |
| --- | --- |
| `users` | Benutzer, Admins und Super-Admins |
| `email_verifications` | 13-stellige E-Mail-Codes |
| `sessions` | Anmeldesitzungen |
| `api_keys` | Benutzer-API-Keys |
| `channels` | Upstream-API-Kanäle |
| `model_catalog` | Modelle im Modellplatz |
| `usage_logs` | Nutzungsdaten der API-Weiterleitung |
| `worker_usage_snapshots` | Workers-Nutzungssnapshots |
| `system_settings` | Systemeinstellungen |

## Deployment 3: Worker-Ressourcen und Variablen binden

Binde D1 in den Worker-Einstellungen:

| Typ | Name | Wert |
| --- | --- | --- |
| D1 database | `DB` | deine D1-Datenbank |

Erforderliche Worker-Variablen:

| Name | Typ | Zweck |
| --- | --- | --- |
| `APP_ORIGIN` | Variable | URL des Pages-Frontends |
| `ADMIN_SETUP_SECRET` | Secret | Passwort für die erste Super-Admin-Einrichtung |
| `JWT_SECRET` | Secret | lange zufällige Zeichenfolge für Sitzungen |

Empfohlene Worker-Variable:

| Name | Typ | Zweck |
| --- | --- | --- |
| `API_PUBLIC_BASE_URL` | Variable | öffentliche Worker-URL, die im Frontend angezeigt wird |

Optionale E-Mail-Variablen:

| Name | Typ | Zweck |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Resend API Key |
| `RESEND_FROM` | Variable | Absender, zum Beispiel `Only API <noreply@example.com>` |

Optionale Turnstile-Worker-Variable:

| Name | Typ | Zweck |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | Secret | Cloudflare Turnstile Secret Key |

Optionale Workers-Nutzungsvariablen:

| Name | Typ | Zweck |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | Variable | Cloudflare Account ID |
| `CF_API_TOKEN` | Secret | API Token mit Leserechten für Workers-Nutzung |
| `WORKERS_DAILY_REQUEST_LIMIT` | Variable | Tageslimit für die Prozentberechnung, Standard `100000` |

Akzeptierte Aliasnamen sind `CLOUDFLARE_ACCOUNT_ID`, `CF_ACCOUNT_TAG`, `CLOUDFLARE_ACCOUNT_TAG`, `CF_ZONE_ID`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN`, `CF_TOKEN` und `CLOUDFLARE_TOKEN`.

Optionale Backend-Umami-Variablen:

| Name | Typ | Zweck |
| --- | --- | --- |
| `UMAMI_BACKEND_ENABLED` | Variable | auf `true` setzen, um Worker-Backend-Tracking zu aktivieren |
| `UMAMI_BACKEND_HOST_URL` | Variable | Umami-Host-URL, zum Beispiel `https://cloud.umami.is` |
| `UMAMI_BACKEND_WEBSITE_ID` | Variable | Umami Website ID für Backend-Tracking |
| `UMAMI_BACKEND_HOSTNAME` | Variable | optionaler Hostname in Umami, zum Beispiel `api.example.com` |

Backend-Umami kann auch in den Systemeinstellungen konfiguriert werden. Worker-Variablen überschreiben die Systemeinstellungen.

Telegram-Benachrichtigungsvariablen:

| Name | Typ | Zweck |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram Bot Token |
| `TELEGRAM_CHAT_ID` | Variable | Telegram-Chat-, Gruppen- oder Kanal-ID |

WxPusher-Benachrichtigungsvariablen:

| Name | Typ | Zweck |
| --- | --- | --- |
| `WXPUSHER_APP_TOKEN` | Secret | WxPusher AppToken |
| `WXPUSHER_UIDS` | Variable | kommagetrennte UID-Liste, erforderlich ohne Topic IDs |
| `WXPUSHER_TOPIC_IDS` | Variable | kommagetrennte Topic-ID-Liste, erforderlich ohne UIDs |

Optionaler Zeitplan:

Du kannst im Cloudflare-Dashboard einen Worker Cron Trigger hinzufügen, zum Beispiel einmal pro Stunde. Die Anwendung führt die Workers-Nutzungsabfrage nur aus, wenn das eingestellte Intervall erreicht ist. Das Standardintervall beträgt 360 Minuten.

## Deployment 4: Pages-Frontend bereitstellen

Verbinde in Cloudflare Pages dasselbe GitHub-Repository.

Pages-Build-Einstellungen:

| Einstellung | Wert |
| --- | --- |
| Framework preset | `React (Vite)` |
| Root directory | leer oder `/` |
| Build command | `npm ci && npm run build:web` |
| Build output directory | `apps/web/dist` |
| Node.js version | `20` oder höher |

Erforderliche Pages-Variable:

```txt
VITE_API_BASE_URL=https://your-worker-domain.workers.dev
```

Optionale Pages-Variablen:

```txt
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
VITE_BACKGROUND_IMAGE_URL=https://example.com/background.jpg
VITE_UMAMI_SCRIPT_URL=https://cloud.umami.is/script.js
VITE_UMAMI_WEBSITE_ID=your-frontend-umami-website-id
VITE_UMAMI_HOST_URL=https://cloud.umami.is
```

Setze nach dem Pages-Deployment die Worker-Variable `APP_ORIGIN` auf die Pages-URL.

## Erste Einrichtung

Öffne die Pages-Frontend-URL. Beim ersten Besuch erscheint die Einrichtungsseite.

Du benötigst:

- `ADMIN_SETUP_SECRET`
- Super-Admin-E-Mail
- Super-Admin-Passwort
- Seitenname
- Selbstnutzungsmodus oder Mehrbenutzermodus

Nach Erstellung des Super-Admins wird die Einrichtungsseite geschlossen, und der Admin-Secret wird im Frontend-Einrichtungsfluss nicht mehr verwendet.

## Registrierungsverifizierung

Wenn E-Mail-Verifizierung aktiviert ist, sendet die Registrierung keinen Link, sondern einen 13-stelligen Zahlencode.

- Der Code ist 13 Minuten gültig.
- Jeder Code erlaubt 3 Eingabeversuche.
- Die Wartezeit für erneutes Senden beträgt 67 Sekunden.
- Im Selbstnutzungsmodus ist E-Mail-Verifizierung standardmäßig aus.
- Im Mehrbenutzermodus ist E-Mail-Verifizierung standardmäßig an.
- E-Mail-Domain-Prüfung und numerische QQ-Mail-Präfixprüfung sind standardmäßig aktiviert.

## Umami-Analytik

Frontend-Umami erfasst Besuche der Pages-Konsole. Konfiguriere es in den Systemeinstellungen oder nutze die Pages-Variablen `VITE_UMAMI_SCRIPT_URL`, `VITE_UMAMI_WEBSITE_ID` und `VITE_UMAMI_HOST_URL`.

Backend-Umami erfasst Worker-Anfragen als `backend_request`-Ereignisse. Konfiguriere es in den Systemeinstellungen oder nutze die Worker-Variablen `UMAMI_BACKEND_ENABLED`, `UMAMI_BACKEND_HOST_URL`, `UMAMI_BACKEND_WEBSITE_ID` und `UMAMI_BACKEND_HOSTNAME`.

Backend-Tracking sendet keine Benutzer-E-Mail, keine API Keys und keine Request-Bodys. Gesendet werden nur Routenkategorie, Methode, Statuscode und Latenz.

## Workers-Nutzung und Benachrichtigungen

Die Workers-Nutzungsüberwachung benötigt die Cloudflare Account ID und API Token Variablen. Wenn sie fehlen, zeigt das Frontend eine Konfigurationsmeldung.

Die Seite zeigt:

- aktuellen verwendeten Prozentsatz
- aktuellen verbleibenden Prozentsatz
- Tageslimit für Anfragen
- Zeitraum des Snapshots

Der Prozentsatz wird berechnet aus den Worker-Anfragen der letzten 24 Stunden geteilt durch `WORKERS_DAILY_REQUEST_LIMIT`. Der Standardwert ist `100000`.

Automatische Abfragen laufen standardmäßig alle 6 Stunden. Ein Klick auf „jetzt sammeln“ sendet sofort eine Benachrichtigung, wenn Telegram- oder WxPusher-Variablen konfiguriert sind.

## API-Nutzung

Client Base URL:

```txt
https://your-worker-domain.workers.dev/v1
```

Header:

```http
Authorization: Bearer oi-only-...
```

Empfohlene SillyTavern-Einstellungen:

```txt
API type: OpenAI Compatible / Custom OpenAI-compatible
API Base URL: https://your-worker-domain.workers.dev/v1
API Key: vollständiger oi-only-... Key
Model: Modellnamen aus dem Modellplatz kopieren
```

## Kanal Base URL

Trage im Kanal die Versionswurzel der Upstream-API ein.

| Dienst | Kanal Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| Andere kompatible Dienste | normalerweise `https://domain/v1` |

Das Backend normalisiert häufige Endungen wie `/v1`, `/v1/`, `/v1/chat` und `/v1/chat/completions`.

## Fehlerbehebung

Wenn das Frontend keine Verbindung zum Backend hat:

1. Prüfe die Pages-Variable `VITE_API_BASE_URL`.
2. Stelle sicher, dass sie auf die Worker-URL zeigt, nicht auf die Pages-URL.
3. Stelle Pages nach Änderung der Pages-Variablen erneut bereit.
4. Prüfe die Worker-Bindung `DB`.
5. Prüfe die Worker-Variablen `APP_ORIGIN`, `ADMIN_SETUP_SECRET` und `JWT_SECRET`.

Wenn SillyTavern Unauthorized meldet:

1. Nutze den vollständigen Key, nicht nur das sichtbare Präfix.
2. Nutze OpenAI Compatible oder Custom OpenAI-compatible.
3. Prüfe, dass vor oder nach dem Key keine Leerzeichen stehen.
4. Prüfe, ob der gewählte Modellname im Modellplatz existiert.

## Erweiterte optionale Variablen

Diese Variablen sind für normale Deployments nicht erforderlich.

| Name | Zweck |
| --- | --- |
| `TELEGRAM_PARSE_MODE` | `HTML`, `MarkdownV2` oder `Markdown` |
| `TELEGRAM_MESSAGE_THREAD_ID` | Telegram Forum Topic Thread ID |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | Telegram Direct Message Topic ID |
| `TELEGRAM_DISABLE_NOTIFICATION` | stille Telegram-Benachrichtigung |
| `TELEGRAM_PROTECT_CONTENT` | Telegram-Inhalte vor Weiterleitung oder Speichern schützen |
| `TELEGRAM_LINK_PREVIEW_DISABLED` | Telegram-Linkvorschau deaktivieren |
| `WXPUSHER_URL` | Link in der WxPusher-Nachricht |
| `WXPUSHER_CONTENT_TYPE` | `1` Text, `2` HTML, `3` Markdown |
| `WXPUSHER_VERIFY_PAY_TYPE` | WxPusher-Filter für zahlende Benutzer |
| `CF_WORKERS_DAILY_REQUEST_LIMIT` | Alias für das Tageslimit |
| `CLOUDFLARE_WORKERS_DAILY_REQUEST_LIMIT` | Alias für das Tageslimit |

Haftungsausschluss: Dieses Projekt ist nur ein API-Weiterleitungswerkzeug. Du bist selbst für Upstream-API-Keys, Anbieterbedingungen, Kosten und rechtliche Einhaltung verantwortlich.
Dieses Repository wird auf unbestimmte Zeit nicht gewartet.
