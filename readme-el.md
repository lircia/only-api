# Only API

Το Only API είναι ένα OpenAI-compatible API gateway για Cloudflare Workers και Pages. Περιλαμβάνει σύνδεση, εγγραφή, επαλήθευση email, API Keys, διαχείριση καναλιών, πλατεία μοντέλων, στατιστικά χρήσης, έλεγχο χρήσης Workers και προαιρετικές ειδοποιήσεις Telegram / WxPusher.

Το προεπιλεγμένο αγγλικό README είναι το [README.md](README.md). Άλλες γλώσσες: [κινεζικά](readme-zh.md) | [ιαπωνικά](readme-ja.md) | [γερμανικά](readme-de.md) | [ρωσικά](readme-ru.md) | [αραβικά](readme-ar.md)

## Δομή έργου

| Σκοπός | Διαδρομή |
| --- | --- |
| Frontend Pages | `apps/web` |
| Backend Worker | `apps/api/src/index.ts` |
| SQL σχήμα D1 | `apps/api/migrations/0001_initial.sql` |
| Εξαρτήσεις και scripts | `package.json` |

## Χαρακτηριστικά

- Η πρώτη ρύθμιση δημιουργεί υπερδιαχειριστή με `ADMIN_SETUP_SECRET`.
- Στη λειτουργία προσωπικής χρήσης η επαλήθευση email είναι απενεργοποιημένη από προεπιλογή. Στη λειτουργία πολλών χρηστών είναι ενεργοποιημένη από προεπιλογή.
- Τα νέα API Keys χρησιμοποιούν `oi-only-`. Τα παλαιότερα κλειδιά που έχουν ήδη δημιουργηθεί παραμένουν έγκυρα.
- Το `/v1/models` επιστρέφει τα ενεργά ονόματα μοντέλων από την πλατεία μοντέλων.
- Η πλατεία μοντέλων υποστηρίζει αλλαγή εμφανιζόμενου ονόματος, αντιγραφή και απόκρυψη.
- Κάθε κανάλι έχει ξεχωριστό κουμπί δοκιμής. Η δοκιμή συγχρονίζει τα upstream `/models`.
- Τα στατιστικά χρήσης εμφανίζουν 3 ώρες, 1 ημέρα, 7 ημέρες, 15 ημέρες και συνολικά δεδομένα.
- Οι ρυθμίσεις συστήματος υποστηρίζουν δοκιμαστικά μηνύματα Telegram και WxPusher.

## Ανάπτυξη 1: Backend Worker

Δημιούργησε Worker στο Cloudflare Workers & Pages και σύνδεσε αυτό το GitHub repository.

| Ρύθμιση | Τιμή |
| --- | --- |
| Root directory | κενό ή `/` |
| Build command | `npm ci` |
| Εντολή ανάπτυξης | `npx wrangler deploy apps/api/src/index.ts --name only-api-worker --compatibility-date 2024-12-01 --keep-vars` |

Το έργο δεν χρειάζεται `wrangler.toml`.

## Ανάπτυξη 2: Βάση D1

Δημιούργησε βάση D1. Προτεινόμενο όνομα για νέα εγκατάσταση:

```txt
only_api
```

Μπορείς να χρησιμοποιήσεις και άλλο όνομα βάσης D1. Το σημαντικό είναι το binding του Worker να ονομάζεται:

```txt
DB
```

Στην κονσόλα D1 εκτέλεσε όλο το SQL από το αρχείο:

```txt
apps/api/migrations/0001_initial.sql
```

Πίνακες που δημιουργούνται:

| Πίνακας | Σκοπός |
| --- | --- |
| `users` | χρήστες και διαχειριστές |
| `email_verifications` | tokens επαλήθευσης email |
| `sessions` | συνεδρίες σύνδεσης |
| `api_keys` | API Keys χρηστών |
| `channels` | upstream κανάλια |
| `model_catalog` | πλατεία μοντέλων |
| `usage_logs` | αρχεία χρήσης αιτημάτων |
| `worker_usage_snapshots` | στιγμιότυπα χρήσης Workers |
| `system_settings` | ρυθμίσεις συστήματος |

## Ανάπτυξη 3: Bindings και μεταβλητές Worker

Στις ρυθμίσεις Worker σύνδεσε τη βάση D1.

| Τύπος | Όνομα | Τιμή |
| --- | --- | --- |
| D1 database | `DB` | η βάση D1 σου |

Υποχρεωτικές μεταβλητές:

| Όνομα | Τύπος | Σημείωση |
| --- | --- | --- |
| `APP_ORIGIN` | Variable | URL του frontend Pages |
| `ADMIN_SETUP_SECRET` | Secret | κλειδί διαχειριστή για την πρώτη ρύθμιση |
| `JWT_SECRET` | Secret | μεγάλη τυχαία συμβολοσειρά |

Προτεινόμενη μεταβλητή:

| Όνομα | Τύπος | Σημείωση |
| --- | --- | --- |
| `API_PUBLIC_BASE_URL` | Variable | δημόσιο Worker URL που εμφανίζεται στο frontend |

Προαιρετικές μεταβλητές:

| Όνομα | Τύπος | Σημείωση |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Resend API Key |
| `RESEND_FROM` | Variable | αποστολέας email |
| `TURNSTILE_SECRET_KEY` | Secret | Turnstile Secret Key |
| `CF_ACCOUNT_ID` | Variable | Cloudflare Account ID |
| `CF_API_TOKEN` | Secret | Token για ανάγνωση χρήσης Workers |

Μεταβλητές που απαιτούνται για ειδοποιήσεις:

| Όνομα | Τύπος | Σημείωση |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram Bot Token |
| `TELEGRAM_CHAT_ID` | Variable | Telegram chat ή group ID |
| `WXPUSHER_APP_TOKEN` | Secret | WxPusher AppToken |
| `WXPUSHER_UIDS` | Variable | WxPusher UIDs. Απαιτείται αν δεν οριστεί `WXPUSHER_TOPIC_IDS` |
| `WXPUSHER_TOPIC_IDS` | Variable | WxPusher Topic IDs. Απαιτείται αν δεν οριστεί `WXPUSHER_UIDS` |

## Ανάπτυξη 4: Frontend Pages

Δημιούργησε Cloudflare Pages project από το ίδιο GitHub repository.

| Ρύθμιση | Τιμή |
| --- | --- |
| Framework preset | `React (Vite)` |
| Root directory | κενό ή `/` |
| Build command | `npm ci && npm run build:web` |
| Build output directory | `apps/web/dist` |
| Έκδοση Node.js | `20` ή νεότερη |

Υποχρεωτική μεταβλητή Pages:

```txt
VITE_API_BASE_URL=https://your-worker-domain
```

Μετά την ανάπτυξη του Pages, όρισε τη μεταβλητή Worker `APP_ORIGIN` στο URL του Pages.

## Πρώτη ρύθμιση και χρήση API

Άνοιξε το URL του Pages και συμπλήρωσε `ADMIN_SETUP_SECRET`, email, κωδικό, όνομα site και λειτουργία προσωπικής χρήσης ή πολλών χρηστών.

Βασικό URL πελάτη:

```txt
https://your-worker-domain/v1
```

Κεφαλίδα:

```http
Authorization: Bearer oi-only-...
```

Προτεινόμενες ρυθμίσεις SillyTavern:

```txt
API type: OpenAI Compatible / Custom OpenAI-compatible
API Base URL: https://your-worker-domain/v1
API Key: πλήρες oi-only-... key
Model: αντιγραφή από την πλατεία μοντέλων
```

Παραδείγματα Channel Base URL:

| Πάροχος | Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |

## Προχωρημένες προαιρετικές μεταβλητές push

Αυτές οι μεταβλητές δεν απαιτούνται για κανονική ανάπτυξη. Απευθύνονται σε χρήστες που γνωρίζουν Telegram topics, μορφοποίηση μηνυμάτων, προεπισκόπηση συνδέσμων ή τη συμπεριφορά πληρωμένων topics στο WxPusher.

| Όνομα | Τύπος | Σημείωση |
| --- | --- | --- |
| `TELEGRAM_PARSE_MODE` | Variable | `HTML`, `MarkdownV2` ή `Markdown` |
| `TELEGRAM_MESSAGE_THREAD_ID` | Variable | Thread ID για Telegram forum topic |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | Variable | Telegram Direct Messages Topic ID |
| `TELEGRAM_DISABLE_NOTIFICATION` | Variable | boolean, αθόρυβη ειδοποίηση |
| `TELEGRAM_PROTECT_CONTENT` | Variable | boolean, προστασία περιεχομένου από προώθηση ή αποθήκευση |
| `TELEGRAM_LINK_PREVIEW_DISABLED` | Variable | boolean, απενεργοποίηση προεπισκόπησης συνδέσμων |
| `WXPUSHER_URL` | Variable | σύνδεσμος μέσα στο μήνυμα |
| `WXPUSHER_CONTENT_TYPE` | Variable | `1` κείμενο, `2` HTML, `3` Markdown. Προεπιλογή `1` |
| `WXPUSHER_VERIFY_PAY_TYPE` | Variable | `0` χωρίς έλεγχο, `1` μόνο πληρωμένοι χρήστες, `2` μη συνδρομητές ή ληγμένοι χρήστες |

Αυτό το αποθετήριο δεν θα συντηρείται επ' αόριστον.
