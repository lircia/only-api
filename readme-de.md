# Only API

Only API ist ein OpenAI-kompatibles API-Gateway für Cloudflare Workers + Pages. Es enthält ein Worker-Backend, ein Pages-Frontend, D1-Speicher, Benutzeranmeldung, Registrierung, API-Key-Ausgabe, Kanalverwaltung, einen Modellplatz, Nutzungsstatistiken, Workers-Nutzungsüberwachung, optionale Telegram- oder WxPusher-Benachrichtigungen und optionale Umami-Analytik.

Direkte Aufrufe einer Upstream-API können hohe Latenz oder Verbindungsfehler verursachen, wenn deren Dienstknoten weit entfernt oder die Netzwerkroute instabil ist. Only API leitet Anfragen über Cloudflare weiter und kann die Verbindung in solchen Situationen verbessern. Außerdem können mehrere OpenAI-kompatible Anbieter hinter einem einzigen API-Endpunkt gebündelt werden, sodass Clients Modelle verschiedener Kanäle über eine Adresse erreichen.

Wir stellen keine API Keys und keine Upstream-API-Endpunkte bereit. Diese Plattform dient nur zur API-Weiterleitung.

Du kannst einen Cloudflare-Domain-Optimierungsdienst oder Preferred-IP-Dienst verwenden, um die Geschwindigkeit zu verbessern. Das Frontend ruft keine Upstream-Anbieter direkt auf, daher muss die Frontend-Domain normalerweise nicht optimiert werden. Links zu solchen Optimierungen kannst du über eine Websuche finden.

Dieses Repository ist für GitHub und das Cloudflare-Dashboard gedacht. `wrangler.toml` hält Worker-Einstieg, Name, normale Variablen und Cron Trigger konsistent; D1 wird manuell gebunden.

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
| Worker-Deployment-Konfiguration | `wrangler.toml` |
| D1-Schema-SQL | `apps/api/migrations/0001_initial.sql` |
| Abhängigkeiten | `package.json` |

## Hauptfunktionen

- Erste Super-Admin-Einrichtung mit `ADMIN_SETUP_SECRET`.
- Registrierung, E-Mail-Code-Verifizierung, E-Mail-Domain-Prüfung, numerische QQ-Mail-Präfixprüfung und Turnstile sind einzeln schaltbar und standardmäßig deaktiviert.
- Optionales Cloudflare Turnstile. Der Frontend Site Key gehört in eine Pages-Variable, der Backend Secret Key in eine Worker-Variable.
- Benutzer-API-Keys verwenden das Präfix `oi-only-` und können vollständig angezeigt, kopiert und gelöscht werden.
- OpenAI-kompatible Weiterleitung für `/v1/*`.
- Keine Benutzerkontingente.
- Einzelne Kanaltests prüfen mehrere Completion-URLs, speichern erfolgreiche URL und Latenz und synchronisieren Modelle über `/models`.
- Modellplatz mit Faltung, editierbaren Namen, kanalweiser Massenaddition/-löschung, `-all` zum Löschen aller Modelle und Bereinigung verwaister Modelle.
- Administratoren können Benutzerstatus und Rollen ändern sowie normale Benutzer löschen; aktueller Benutzer und Super-Admin sind geschützt.
- Nutzungsstatistiken für 3 Stunden, 1 Tag, 7 Tage, 15 Tage und Gesamtansicht.
- Workers-Nutzung zeigt verwendeten Prozentsatz und verbleibenden Prozentsatz.
- Mit einem Worker Cron Trigger wird die Workers-Nutzung standardmäßig alle 6 Stunden abgefragt und kann an Telegram oder WxPusher gesendet werden.
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
| Deploy command | `npx wrangler deploy` |

Wrangler ist das offizielle Cloudflare-Deployment-Werkzeug. Der Git-Build liest `wrangler.toml`, stellt Code bereit, behält normale Variablen mit `keep_vars = true` und richtet den stündlichen Cron Trigger ein. D1 ist nicht deklariert; falls das Binding nach einem Update fehlt, binde die vorhandene D1 manuell wieder als `DB` ein.

## Deployment 2: D1-Datenbank erstellen oder weiterverwenden

Erstelle D1 nur beim ersten Deployment und verwende sie bei Updates weiter.

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

Prüfe nach jedem Worker-Deployment das Binding und binde D1 bei Bedarf manuell:

| Typ | Name | Wert |
| --- | --- | --- |
| D1 database | `DB` | vorhandene Datenbank `only_api` |

Für die erste Einrichtung erforderliche Worker-Variable:

| Name | Typ | Zweck |
| --- | --- | --- |
| `ADMIN_SETUP_SECRET` | Geheimnis | Passwort für die erste Super-Admin-Einrichtung |

Nach Erstellung des Super-Admins wird `ADMIN_SETUP_SECRET` nicht mehr gelesen und kann entfernt oder geändert werden.

Empfohlene Worker-Variablen:

| Name | Typ | Zweck |
| --- | --- | --- |
| `APP_ORIGIN` | Variable | Pages-URL zur CORS-Beschränkung; ohne Wert gilt `*` |
| `API_PUBLIC_BASE_URL` | Variable | öffentliche Worker-Basis-URL auf der API-Key-Seite, z. B. `https://dein-worker.workers.dev`; ohne `/v1` |

Optionale E-Mail-Variablen:

| Name | Typ | Zweck |
| --- | --- | --- |
| `RESEND_API_KEY` | Geheimnis | Resend API Key |
| `RESEND_FROM` | Variable | Absender, zum Beispiel `Only API <noreply@example.com>` |

Bei aktivierter E-Mail-Verifizierung sind beide E-Mail-Variablen erforderlich.

Optionale Turnstile-Worker-Variable:

| Name | Typ | Zweck |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | Geheimnis | Cloudflare Turnstile Secret Key |

Bei aktiviertem Turnstile sind dieses Worker-Geheimnis und die Pages-Variable `VITE_TURNSTILE_SITE_KEY` erforderlich.

Optionale Workers-Nutzungsvariablen:

| Name | Typ | Zweck |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | Variable | Cloudflare Account ID |
| `CF_API_TOKEN` | Geheimnis | API Token mit Leserechten für Workers-Nutzung |
| `WORKERS_DAILY_REQUEST_LIMIT` | Variable | Tageslimit für die Prozentberechnung, Standard `100000` |

Akzeptierte Aliasnamen sind `CLOUDFLARE_ACCOUNT_ID`, `CF_ACCOUNT_TAG`, `CLOUDFLARE_ACCOUNT_TAG`, `CLOUDFLARE_API_TOKEN`, `CF_TOKEN` und `CLOUDFLARE_TOKEN`. Für die GraphQL-Abfrage ist die Account ID erforderlich; eine Zone ID reicht nicht.

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
| `TELEGRAM_BOT_TOKEN` | Geheimnis | Telegram Bot Token |
| `TELEGRAM_CHAT_ID` | Variable | Telegram-Chat-, Gruppen- oder Kanal-ID |

WxPusher-Benachrichtigungsvariablen:

| Name | Typ | Zweck |
| --- | --- | --- |
| `WXPUSHER_APP_TOKEN` | Geheimnis | WxPusher AppToken |
| `WXPUSHER_UIDS` | Variable | kommagetrennte UID-Liste, erforderlich ohne Topic IDs |
| `WXPUSHER_TOPIC_IDS` | Variable | kommagetrennte Topic-ID-Liste, erforderlich ohne UIDs |

Pflichtregeln optionaler Funktionen: E-Mail benötigt beide Resend-Variablen; Turnstile benötigt Worker Secret Key und Pages Site Key; Workers-Nutzung benötigt `CF_ACCOUNT_ID` und `CF_API_TOKEN`, während das Tageslimit optional mit Standard `100000` ist. Backend-Umami benötigt bei Aktivierung eine Website ID. Telegram benötigt Bot Token und Chat ID. WxPusher benötigt AppToken und mindestens UID oder Topic ID; übrige Variablen sind optional.

Erforderlicher Zeitplan für automatische Prüfungen und Benachrichtigungen:

`wrangler.toml` startet den Worker mit `0 * * * *` stündlich. Kanalprüfungen laufen standardmäßig alle 60 Minuten; jede Kandidaten-URL darf bis zu 60 Sekunden warten. Workers-Nutzung wird alle 360 Minuten (6 Stunden) erfasst und bei aktivierten Benachrichtigungen im gleichen Abstand gesendet.

## Deployment 4: Pages-Frontend bereitstellen

Verbinde in Cloudflare Pages dasselbe GitHub-Repository.

Pages-Build-Einstellungen:

| Einstellung | Wert |
| --- | --- |
| Framework preset | `React (Vite)` |
| Root directory | leer oder `/` |
| Build command | `npm ci && npm run build:web` |
| Build output directory | `apps/web/dist` |

Erforderliche Pages-Variable:

| Name | Typ | Zweck |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Variable | Worker-Basis-URL, die das Frontend tatsächlich aufruft, z. B. `https://dein-worker.workers.dev`; ohne `/v1` |

Optionale Pages-Variablen:

| Name | Typ | Zweck |
| --- | --- | --- |
| `NODE_VERSION` | Build-Variable | Bei Bedarf auf `20` setzen |
| `VITE_TURNSTILE_SITE_KEY` | Variable | öffentlicher Turnstile Site Key; bei aktiviertem Turnstile erforderlich |
| `VITE_BACKGROUND_IMAGE_URL` | Variable | Standard-URL des Hintergrundbilds |
| `VITE_UMAMI_SCRIPT_URL` | Variable | URL des Umami-Skripts, z. B. `https://cloud.umami.is/script.js` |
| `VITE_UMAMI_WEBSITE_ID` | Variable | Frontend-Umami Website ID; aktiviert auch das Fallback-Tracking |
| `VITE_UMAMI_HOST_URL` | Variable | optionale Umami-Host-URL, vor allem für selbst gehostetes Umami |

Alle Variablen mit Präfix `VITE_` werden in das Browser-JavaScript eingebaut und sind öffentlich sichtbar. Dort dürfen keine Geheimnisse, Upstream API Keys, Worker Tokens oder Turnstile Secret Keys gespeichert werden.

`API_PUBLIC_BASE_URL` und `VITE_API_BASE_URL` enthalten normalerweise dieselbe Worker-URL. Erstere ist eine optionale Worker-Variable nur zur Anzeige; letztere ist eine notwendige Pages-Buildvariable und steuert die tatsächlichen Frontend-Anfragen.

Setze nach dem Pages-Deployment die Worker-Variable `APP_ORIGIN` auf die Pages-URL.

## Erste Einrichtung

Öffne die Pages-Frontend-URL. Beim ersten Besuch erscheint die Einrichtungsseite.

Du benötigst:

- `ADMIN_SETUP_SECRET`
- Super-Admin-E-Mail
- Super-Admin-Passwort
- Seitenname

Nach Erstellung des Super-Admins wird die Einrichtungsseite geschlossen. Registrierung, E-Mail-Verifizierung, Domain- und QQ-Prüfung, Turnstile, Workers-Benachrichtigungen und Umami sind standardmäßig deaktiviert.

## Registrierungsverifizierung

Wenn E-Mail-Verifizierung aktiviert ist, sendet die Registrierung keinen Link, sondern einen 13-stelligen Zahlencode.

- Der Code ist 13 Minuten gültig.
- Jeder Code erlaubt 3 Eingabeversuche.
- Die Wartezeit für erneutes Senden beträgt 67 Sekunden.
- Registrierung, E-Mail-Verifizierung, Domain-Prüfung und QQ-Präfixprüfung sind standardmäßig deaktiviert.
- Bei aktivierter Domain-Prüfung sind nur `qq.com`, `163.com`, `gmail.com`, `outlook.com`, `yeah.net`, `hotmail.com`, `126.com`, `foxmail.com`, `icloud.com`, `yahoo.com`, `sina.com` und `live.com` erlaubt.
- Bei aktivierter QQ-Prüfung darf der Teil vor `@` bei `qq.com` nur aus Ziffern bestehen.

## Umami-Analytik

Frontend-Umami erfasst Besuche der Pages-Konsole. Konfiguriere es in den Systemeinstellungen oder nutze die Pages-Variablen `VITE_UMAMI_SCRIPT_URL`, `VITE_UMAMI_WEBSITE_ID` und `VITE_UMAMI_HOST_URL`.

Backend-Umami sendet `backend_request`-Ereignisse über den offiziellen Endpunkt `POST /api/send`. Bei Aktivierung ist die Website ID erforderlich. Die Schaltfläche zum Speichern und Testen sendet ein `umami_test`-Ereignis.

Backend-Tracking sendet keine Benutzer-E-Mail, keine API Keys und keine Request-Bodys. Gesendet werden nur Routenkategorie, Methode, Statuscode und Latenz.

## Workers-Nutzung und Benachrichtigungen

Die Workers-Nutzungsüberwachung benötigt die Cloudflare Account ID und API Token Variablen. Wenn sie fehlen, zeigt das Frontend eine Konfigurationsmeldung.

Verwende die Account ID aus der Kontoübersicht, keine Zone ID. Das Token benötigt `Account > Account Analytics > Read`. Fehlende Variablen und der letzte GraphQL-Fehler werden angezeigt; fehlgeschlagene Abfragen werden nicht als Nullnutzung gespeichert oder gesendet.

Die Seite zeigt:

- aktuellen verwendeten Prozentsatz
- aktuellen verbleibenden Prozentsatz
- Tageslimit für Anfragen
- Zeitraum des Snapshots

Der Prozentsatz wird berechnet aus den Worker-Anfragen der letzten 24 Stunden geteilt durch `WORKERS_DAILY_REQUEST_LIMIT`. Der Standardwert ist `100000`.

Die automatische Erfassung erfolgt standardmäßig alle 6 Stunden und benötigt den oben beschriebenen Cron Trigger. Für automatische Push-Nachrichten muss auch der Benachrichtigungsschalter aktiv sein. „Jetzt sammeln“ sendet bei konfiguriertem Telegram oder WxPusher auch bei deaktivierter Automatik sofort eine Nachricht.

## API-Nutzung

Client Base URL:

```txt
https://your-worker-domain.workers.dev/v1
```

Header:

```http
Authorization: Bearer oi-only-...
```

## Kanal Base URL

Trage im Kanal die Versionswurzel der Upstream-API ein.

| Dienst | Kanal Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| Andere kompatible Dienste | normalerweise `https://domain/v1` |

Der Kanaltest erstellt zuerst `/v1/chat/completions`, prüft danach übliche Endungskombinationen und zuletzt die ursprüngliche URL. Erfolgreiche vollständige URL und Latenz werden gespeichert und für Completion-Anfragen verwendet. Die Modellsynchronisierung nutzt weiterhin Base URL plus `/v1/models`.

Im Modellplatz können Administratoren Modelle eines ausgewählten Kanals gesammelt hinzufügen oder ausblenden. `-all` bei der Massenlöschung blendet alle Modelle dieses Kanals aus; erneutes Hinzufügen aktiviert sie wieder. Die Bereinigung entfernt Modelle gelöschter Kanäle.

Neue API Keys werden vollständig angezeigt und können kopiert oder gelöscht werden. Alte Keys ohne gespeicherten Klartext können nicht wiederhergestellt werden; erstelle einen neuen Key, wenn nur das Präfix sichtbar ist. Normale Benutzer können gelöscht werden, aktueller Benutzer und Super-Admin jedoch nicht.

## Fehlerbehebung

Wenn das Frontend keine Verbindung zum Backend hat:

1. Prüfe die Pages-Variable `VITE_API_BASE_URL`.
2. Stelle sicher, dass sie auf die Worker-URL zeigt, nicht auf die Pages-URL.
3. Stelle Pages nach Änderung der Pages-Variablen erneut bereit.
4. Prüfe die Worker-Bindung `DB`.
5. Prüfe das Worker-`DB`-Binding und `APP_ORIGIN`; bei der ersten Einrichtung auch `ADMIN_SETUP_SECRET`.

## Erweiterte optionale Variablen

Diese Variablen sind für normale Deployments nicht erforderlich.

| Name | Zweck |
| --- | --- |
| `TELEGRAM_PARSE_MODE` | `HTML`, `MarkdownV2` oder `Markdown` |
| `TELEGRAM_MESSAGE_THREAD_ID` | ID eines Telegram-Forumthemas |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | ID eines Telegram-Direktnachrichtenthemas |
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
