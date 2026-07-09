# Only API

Το Only API είναι μια πύλη API συμβατή με OpenAI για Cloudflare Workers + Pages. Περιλαμβάνει Worker backend, Pages frontend, βάση D1, σύνδεση χρηστών, εγγραφή, διανομή API Key, διαχείριση καναλιών, πλατεία μοντέλων, στατιστικά χρήσης, παρακολούθηση χρήσης Workers και προαιρετικές ειδοποιήσεις Telegram / WxPusher.

Έχεις θελήσει ποτέ να χρησιμοποιήσεις το API κάποιου παρόχου ή πλατφόρμας, αλλά το endpoint είχε μεγάλη καθυστέρηση τοπικά ή μερικές φορές δεν ήταν προσβάσιμο; Αυτό το έργο μπορεί να λύσει ένα μέρος αυτού του προβλήματος προωθώντας τα API αιτήματα μέσω Cloudflare.

Δεν παρέχουμε κανένα API Key και κανένα upstream API endpoint. Η πλατφόρμα αυτή χρησιμοποιείται μόνο για API forwarding.

Μπορείς να χρησιμοποιήσεις υπηρεσία βελτιστοποίησης τομέα Cloudflare ή preferred-IP για καλύτερη ταχύτητα. Το frontend δεν καλεί απευθείας τους upstream παρόχους, επομένως ο τομέας του frontend συνήθως δεν χρειάζεται βελτιστοποίηση. Μπορείς να βρεις σχετικούς συνδέσμους μέσω αναζήτησης στο διαδίκτυο.

Το αποθετήριο έχει σχεδιαστεί για φιλοξενία στο GitHub και ανάπτυξη από τον πίνακα Cloudflare. Δεν χρησιμοποιεί `wrangler.toml`.

## Γλώσσες

- [English](README.md)
- [中文](readme-zh.md)
- [日本語](readme-ja.md)
- [Deutsch](readme-de.md)
- [Русский](readme-ru.md)
- [العربية](readme-ar.md)

## Διαδρομές έργου

| Σκοπός | Διαδρομή |
| --- | --- |
| Pages frontend | `apps/web` |
| Worker backend | `apps/api/src/index.ts` |
| D1 schema SQL | `apps/api/migrations/0001_initial.sql` |
| Αρχείο εξαρτήσεων | `package.json` |

## Κύριες λειτουργίες

- Πρώτη ρύθμιση super admin με `ADMIN_SETUP_SECRET`.
- Λειτουργία προσωπικής χρήσης και λειτουργία πολλών χρηστών.
- Διακόπτης εγγραφής, επαλήθευση με κωδικό email, επιβεβαίωση κωδικού πρόσβασης, έλεγχος κατάληξης email και έλεγχος αριθμητικού προθέματος QQ email.
- Προαιρετικό Cloudflare Turnstile. Το frontend Site Key μπαίνει σε μεταβλητή Pages και το backend Secret Key σε μεταβλητή Worker.
- Τα API Key των χρηστών χρησιμοποιούν το πρόθεμα `oi-only-`.
- OpenAI-compatible forwarding για `/v1/*`.
- Δεν επιβάλλονται όρια χρήσης ανά χρήστη.
- Έλεγχος καναλιών και συγχρονισμός μοντέλων από upstream `/models`.
- Η πλατεία μοντέλων εμφανίζει ένα μοντέλο ανά γραμμή, με επεξεργάσιμο εμφανιζόμενο όνομα και δυνατότητα απόκρυψης.
- Στατιστικά χρήσης για 3 ώρες, 1 ημέρα, 7 ημέρες, 15 ημέρες και συνολικά.
- Η σελίδα Workers δείχνει ποσοστό χρήσης και ποσοστό υπολοίπου.
- Η χρήση Workers ελέγχεται προεπιλεγμένα κάθε 6 ώρες και μπορεί να αποσταλεί σε Telegram ή WxPusher.
- Η ώρα στο frontend εμφανίζεται με προσαρμογή UTC+8.
- Ενσωματωμένα θέματα: μαύρο-λευκό, ανοιχτό μπλε-λευκό, κίτρινο-μωβ, πράσινο-κόκκινο και ροζ-πορτοκαλί.
- Προαιρετική εικόνα φόντου frontend μέσω URL.

## Ανάπτυξη 1: Ανάπτυξη Worker

Στο Cloudflare Workers & Pages, δημιούργησε ή άνοιξε ένα Worker project και σύνδεσε αυτό το GitHub repository.

Ρυθμίσεις build για Worker:

| Ρύθμιση | Τιμή |
| --- | --- |
| Root directory | κενό ή `/` |
| Build command | `npm ci` |
| Deploy command | `npx wrangler deploy apps/api/src/index.ts --name only-api-worker --compatibility-date 2024-12-01 --keep-vars` |

Το `--keep-vars` βοηθά να διατηρηθούν οι μεταβλητές και τα secrets που όρισες στον πίνακα Cloudflare. Αν μετά από ενημέρωση χαθούν μεταβλητές ή το D1 binding, βεβαιώσου ότι αναπτύσσεις ξανά τον ίδιο Worker και δεν δημιουργείς νέο Worker. Έπειτα έλεγξε ξανά τη σελίδα bindings του Worker.

## Ανάπτυξη 2: Δημιουργία D1 βάσης

Δημιούργησε βάση D1 στον πίνακα Cloudflare.

Προτεινόμενο όνομα βάσης:

```txt
only_api
```

Το όνομα binding του Worker πρέπει να είναι:

```txt
DB
```

Άνοιξε την κονσόλα D1 και εκτέλεσε όλο το SQL από:

```txt
apps/api/migrations/0001_initial.sql
```

Πίνακες που δημιουργούνται:

| Πίνακας | Σκοπός |
| --- | --- |
| `users` | Χρήστες, admins και super admins |
| `email_verifications` | 13-ψήφιοι κωδικοί επαλήθευσης email |
| `sessions` | Συνεδρίες σύνδεσης |
| `api_keys` | API Key χρηστών |
| `channels` | Upstream API κανάλια |
| `model_catalog` | Μοντέλα της πλατείας μοντέλων |
| `usage_logs` | Εγγραφές χρήσης API forwarding |
| `worker_usage_snapshots` | Στιγμιότυπα χρήσης Workers |
| `system_settings` | Ρυθμίσεις συστήματος |

## Ανάπτυξη 3: Σύνδεση πόρων και μεταβλητών Worker

Στις ρυθμίσεις Worker σύνδεσε τη D1:

| Τύπος | Όνομα | Τιμή |
| --- | --- | --- |
| D1 database | `DB` | η D1 βάση σου |

Απαραίτητες μεταβλητές Worker:

| Όνομα | Τύπος | Σκοπός |
| --- | --- | --- |
| `APP_ORIGIN` | Variable | URL του Pages frontend |
| `ADMIN_SETUP_SECRET` | Secret | κωδικός για την πρώτη ρύθμιση super admin |
| `JWT_SECRET` | Secret | μεγάλο τυχαίο κείμενο για συνεδρίες |

Προτεινόμενη μεταβλητή Worker:

| Όνομα | Τύπος | Σκοπός |
| --- | --- | --- |
| `API_PUBLIC_BASE_URL` | Variable | δημόσιο Worker URL που εμφανίζεται στο frontend |

Προαιρετικές μεταβλητές email:

| Όνομα | Τύπος | Σκοπός |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Resend API Key |
| `RESEND_FROM` | Variable | αποστολέας, για παράδειγμα `Only API <noreply@example.com>` |

Προαιρετική μεταβλητή Turnstile για Worker:

| Όνομα | Τύπος | Σκοπός |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | Secret | Cloudflare Turnstile Secret Key |

Προαιρετικές μεταβλητές χρήσης Workers:

| Όνομα | Τύπος | Σκοπός |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | Variable | Cloudflare Account ID |
| `CF_API_TOKEN` | Secret | API Token με δικαίωμα ανάγνωσης χρήσης Workers |
| `WORKERS_DAILY_REQUEST_LIMIT` | Variable | ημερήσιο όριο αιτημάτων για υπολογισμό ποσοστού, προεπιλογή `100000` |

Γίνονται δεκτά και τα alias `CLOUDFLARE_ACCOUNT_ID`, `CF_ACCOUNT_TAG`, `CLOUDFLARE_ACCOUNT_TAG`, `CF_ZONE_ID`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN`, `CF_TOKEN` και `CLOUDFLARE_TOKEN`.

Μεταβλητές ειδοποιήσεων Telegram:

| Όνομα | Τύπος | Σκοπός |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Variable | ID συνομιλίας, ομάδας ή καναλιού Telegram |

Μεταβλητές ειδοποιήσεων WxPusher:

| Όνομα | Τύπος | Σκοπός |
| --- | --- | --- |
| `WXPUSHER_APP_TOKEN` | Secret | WxPusher AppToken |
| `WXPUSHER_UIDS` | Variable | λίστα UID με κόμματα, απαραίτητη αν δεν χρησιμοποιούνται Topic IDs |
| `WXPUSHER_TOPIC_IDS` | Variable | λίστα Topic ID με κόμματα, απαραίτητη αν δεν χρησιμοποιούνται UIDs |

Προαιρετικός χρονοπρογραμματισμός:

Μπορείς να προσθέσεις Worker Cron Trigger στον πίνακα Cloudflare, για παράδειγμα κάθε ώρα. Η εφαρμογή εκτελεί το Workers usage query μόνο όταν περάσει το ρυθμισμένο διάστημα. Το προεπιλεγμένο διάστημα είναι 360 λεπτά.

## Ανάπτυξη 4: Ανάπτυξη Pages frontend

Στο Cloudflare Pages σύνδεσε το ίδιο GitHub repository.

Ρυθμίσεις build για Pages:

| Ρύθμιση | Τιμή |
| --- | --- |
| Framework preset | `React (Vite)` |
| Root directory | κενό ή `/` |
| Build command | `npm ci && npm run build:web` |
| Build output directory | `apps/web/dist` |
| Node.js version | `20` ή νεότερο |

Απαραίτητη μεταβλητή Pages:

```txt
VITE_API_BASE_URL=https://your-worker-domain.workers.dev
```

Προαιρετικές μεταβλητές Pages:

```txt
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
VITE_BACKGROUND_IMAGE_URL=https://example.com/background.jpg
```

Μετά την ανάπτυξη Pages, όρισε τη μεταβλητή Worker `APP_ORIGIN` στο Pages URL.

## Πρώτη ρύθμιση

Άνοιξε το Pages frontend URL. Στην πρώτη επίσκεψη εμφανίζεται η σελίδα ρύθμισης.

Χρειάζεσαι:

- `ADMIN_SETUP_SECRET`
- email super admin
- κωδικό πρόσβασης super admin
- όνομα ιστότοπου
- λειτουργία προσωπικής χρήσης ή πολλών χρηστών

Μετά τη δημιουργία του super admin, η σελίδα ρύθμισης κλείνει και το setup secret δεν χρησιμοποιείται πλέον από τη ροή ρύθμισης του frontend.

## Επαλήθευση εγγραφής

Όταν είναι ενεργή η επαλήθευση email, η εγγραφή στέλνει 13-ψήφιο αριθμητικό κωδικό αντί για σύνδεσμο.

- Ο κωδικός ισχύει για 13 λεπτά.
- Κάθε κωδικός επιτρέπει 3 προσπάθειες εισαγωγής.
- Η επαναποστολή έχει αναμονή 67 δευτερολέπτων.
- Στη λειτουργία προσωπικής χρήσης η επαλήθευση email είναι προεπιλεγμένα κλειστή.
- Στη λειτουργία πολλών χρηστών η επαλήθευση email είναι προεπιλεγμένα ενεργή.
- Ο έλεγχος κατάληξης email και ο έλεγχος αριθμητικού προθέματος QQ email είναι προεπιλεγμένα ενεργοί.

## Χρήση Workers και ειδοποιήσεις

Η παρακολούθηση χρήσης Workers απαιτεί Cloudflare Account ID και API Token. Αν λείπουν, το frontend εμφανίζει μήνυμα ρύθμισης.

Η σελίδα εμφανίζει:

- τρέχον ποσοστό χρήσης
- τρέχον ποσοστό υπολοίπου
- ημερήσιο όριο αιτημάτων
- χρονικό εύρος στιγμιότυπου

Το ποσοστό υπολογίζεται από τα Worker αιτήματα των τελευταίων 24 ωρών διαιρεμένα με `WORKERS_DAILY_REQUEST_LIMIT`. Η προεπιλογή είναι `100000`.

Οι αυτόματοι έλεγχοι γίνονται προεπιλεγμένα κάθε 6 ώρες. Το πάτημα του "collect now" στέλνει άμεσα ειδοποίηση αν έχουν ρυθμιστεί μεταβλητές Telegram ή WxPusher.

## Χρήση API

Client Base URL:

```txt
https://your-worker-domain.workers.dev/v1
```

Header:

```http
Authorization: Bearer oi-only-...
```

Προτεινόμενες ρυθμίσεις SillyTavern:

```txt
API type: OpenAI Compatible / Custom OpenAI-compatible
API Base URL: https://your-worker-domain.workers.dev/v1
API Key: πλήρες oi-only-... key
Model: όνομα μοντέλου αντιγραμμένο από την πλατεία μοντέλων
```

## Channel Base URL

Στο κανάλι βάλε το version root του upstream API.

| Υπηρεσία | Channel Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| Άλλες συμβατές υπηρεσίες | συνήθως `https://domain/v1` |

Το backend διορθώνει αυτόματα κοινές καταλήξεις όπως `/v1`, `/v1/`, `/v1/chat` και `/v1/chat/completions`.

## Αντιμετώπιση προβλημάτων

Αν το frontend δεν συνδέεται στο backend:

1. Έλεγξε τη μεταβλητή Pages `VITE_API_BASE_URL`.
2. Βεβαιώσου ότι δείχνει στο Worker URL και όχι στο Pages URL.
3. Κάνε ξανά deploy το Pages μετά από αλλαγή μεταβλητών Pages.
4. Έλεγξε το Worker binding `DB`.
5. Έλεγξε τις Worker μεταβλητές `APP_ORIGIN`, `ADMIN_SETUP_SECRET` και `JWT_SECRET`.

Αν το SillyTavern εμφανίζει Unauthorized:

1. Χρησιμοποίησε το πλήρες key, όχι μόνο το ορατό πρόθεμα.
2. Χρησιμοποίησε OpenAI Compatible ή Custom OpenAI-compatible.
3. Βεβαιώσου ότι δεν υπάρχουν κενά πριν ή μετά το key.
4. Βεβαιώσου ότι το επιλεγμένο όνομα μοντέλου υπάρχει στην πλατεία μοντέλων.

## Προχωρημένες προαιρετικές μεταβλητές

Δεν απαιτούνται για κανονική ανάπτυξη.

| Όνομα | Σκοπός |
| --- | --- |
| `TELEGRAM_PARSE_MODE` | `HTML`, `MarkdownV2` ή `Markdown` |
| `TELEGRAM_MESSAGE_THREAD_ID` | Telegram forum topic thread ID |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | Telegram direct message topic ID |
| `TELEGRAM_DISABLE_NOTIFICATION` | αθόρυβη ειδοποίηση Telegram |
| `TELEGRAM_PROTECT_CONTENT` | προστασία περιεχομένου Telegram από προώθηση ή αποθήκευση |
| `TELEGRAM_LINK_PREVIEW_DISABLED` | απενεργοποίηση προεπισκόπησης συνδέσμων Telegram |
| `WXPUSHER_URL` | σύνδεσμος στο μήνυμα WxPusher |
| `WXPUSHER_CONTENT_TYPE` | `1` κείμενο, `2` HTML, `3` Markdown |
| `WXPUSHER_VERIFY_PAY_TYPE` | φίλτρο πληρωμένων χρηστών WxPusher |
| `CF_WORKERS_DAILY_REQUEST_LIMIT` | alias για το ημερήσιο όριο |
| `CLOUDFLARE_WORKERS_DAILY_REQUEST_LIMIT` | alias για το ημερήσιο όριο |

Αποποίηση ευθύνης: Αυτό το έργο είναι μόνο εργαλείο API forwarding. Είσαι υπεύθυνος για τα upstream API Key, τους όρους παρόχων, τα κόστη και τη νομική συμμόρφωση.
Αυτό το αποθετήριο δεν συντηρείται επ' αόριστον.
