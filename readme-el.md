# Only API

Το Only API είναι μια πύλη API συμβατή με OpenAI για Cloudflare Workers + Pages. Περιλαμβάνει Worker backend, Pages frontend, βάση D1, σύνδεση χρηστών, εγγραφή, διανομή API Key, διαχείριση καναλιών, πλατεία μοντέλων, στατιστικά χρήσης, παρακολούθηση χρήσης Workers, προαιρετικές ειδοποιήσεις Telegram / WxPusher και προαιρετικά στατιστικά Umami.

Οι απευθείας κλήσεις σε ένα upstream API μπορεί να παρουσιάζουν μεγάλη καθυστέρηση ή αποτυχίες σύνδεσης όταν οι κόμβοι της υπηρεσίας βρίσκονται μακριά ή η διαδρομή δικτύου είναι ασταθής. Το Only API προωθεί τα αιτήματα μέσω Cloudflare και μπορεί να βελτιώσει τη συνδεσιμότητα σε τέτοιες περιπτώσεις. Μπορεί επίσης να συγκεντρώσει πολλούς παρόχους συμβατούς με OpenAI πίσω από ένα API endpoint, ώστε οι πελάτες να χρησιμοποιούν μία διεύθυνση για μοντέλα από διαφορετικά κανάλια.

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
- Η εγγραφή, η επαλήθευση με κωδικό email, ο έλεγχος domain και προθέματος QQ και το Turnstile ενεργοποιούνται ανεξάρτητα και είναι προεπιλεγμένα ανενεργά.
- Προαιρετικό Cloudflare Turnstile. Το frontend Site Key μπαίνει σε μεταβλητή Pages και το backend Secret Key σε μεταβλητή Worker.
- Τα API Key των χρηστών χρησιμοποιούν το πρόθεμα `oi-only-` και υποστηρίζουν πλήρη εμφάνιση, αντιγραφή και διαγραφή.
- OpenAI-compatible forwarding για `/v1/*`.
- Δεν επιβάλλονται όρια χρήσης ανά χρήστη.
- Ο μεμονωμένος έλεγχος καναλιού δοκιμάζει πολλά URL, αποθηκεύει το επιτυχημένο URL και την καθυστέρηση και συγχρονίζει μοντέλα από `/models`.
- Η λίστα μοντέλων υποστηρίζει σύμπτυξη, αλλαγή ονομάτων, μαζική προσθήκη/διαγραφή ανά κανάλι, `-all` για διαγραφή όλων και καθαρισμό υπολειπόμενων μοντέλων.
- Ο διαχειριστής μπορεί να αλλάζει κατάσταση και ρόλο χρηστών και να διαγράφει απλούς χρήστες· ο τρέχων χρήστης και ο super admin προστατεύονται.
- Στατιστικά χρήσης για 3 ώρες, 1 ημέρα, 7 ημέρες, 15 ημέρες και συνολικά.
- Η σελίδα Workers δείχνει ποσοστό χρήσης και ποσοστό υπολοίπου.
- Με ρυθμισμένο Worker Cron Trigger, η χρήση Workers ελέγχεται προεπιλεγμένα κάθε 6 ώρες και μπορεί να αποσταλεί σε Telegram ή WxPusher.
- Προαιρετικά στατιστικά Umami χωριστά για το Pages frontend και το Worker backend.
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

Το `--keep-vars` διατηρεί μόνο τις απλές μεταβλητές περιβάλλοντος του πίνακα. Τα μυστικά διατηρούνται χωριστά από το Cloudflare, αλλά η σύνδεση D1 ούτε δηλώνεται ούτε εγγυάται. Επειδή το αποθετήριο δεν χρησιμοποιεί αρχείο ρυθμίσεων Wrangler, ανάπτυσσε πάντα στον ίδιο Worker και έλεγχε τη σύνδεση `DB` μετά από κάθε ενημέρωση. Αν λείπει, σύνδεσε ξανά την υπάρχουσα D1 χωρίς να δημιουργήσεις νέα βάση.

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

Απαραίτητη μεταβλητή Worker για την πρώτη ρύθμιση:

| Όνομα | Τύπος | Σκοπός |
| --- | --- | --- |
| `ADMIN_SETUP_SECRET` | Μυστικό | κωδικός για την πρώτη ρύθμιση super admin |

Μετά τη δημιουργία του super admin, το `ADMIN_SETUP_SECRET` δεν διαβάζεται πλέον και μπορεί να αφαιρεθεί ή να αλλάξει.

Προτεινόμενες μεταβλητές Worker:

| Όνομα | Τύπος | Σκοπός |
| --- | --- | --- |
| `APP_ORIGIN` | Μεταβλητή | URL Pages για περιορισμό CORS· χωρίς τιμή χρησιμοποιείται `*` |
| `API_PUBLIC_BASE_URL` | Μεταβλητή | δημόσιο Worker URL που εμφανίζεται στο frontend |

Προαιρετικές μεταβλητές email:

| Όνομα | Τύπος | Σκοπός |
| --- | --- | --- |
| `RESEND_API_KEY` | Μυστικό | Resend API Key |
| `RESEND_FROM` | Μεταβλητή | αποστολέας, για παράδειγμα `Only API <noreply@example.com>` |

Όταν ενεργοποιείται η επαλήθευση email, απαιτούνται και οι δύο μεταβλητές.

Προαιρετική μεταβλητή Turnstile για Worker:

| Όνομα | Τύπος | Σκοπός |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | Μυστικό | Cloudflare Turnstile Secret Key |

Όταν ενεργοποιείται το Turnstile, απαιτούνται αυτό το μυστικό Worker και η μεταβλητή Pages `VITE_TURNSTILE_SITE_KEY`.

Προαιρετικές μεταβλητές χρήσης Workers:

| Όνομα | Τύπος | Σκοπός |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | Μεταβλητή | ID λογαριασμού Cloudflare |
| `CF_API_TOKEN` | Μυστικό | API Token με δικαίωμα ανάγνωσης χρήσης Workers |
| `WORKERS_DAILY_REQUEST_LIMIT` | Μεταβλητή | ημερήσιο όριο αιτημάτων για υπολογισμό ποσοστού, προεπιλογή `100000` |

Γίνονται δεκτά και τα alias `CLOUDFLARE_ACCOUNT_ID`, `CF_ACCOUNT_TAG`, `CLOUDFLARE_ACCOUNT_TAG`, `CF_ZONE_ID`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN`, `CF_TOKEN` και `CLOUDFLARE_TOKEN`.

Προαιρετικές μεταβλητές backend Umami:

| Όνομα | Τύπος | Σκοπός |
| --- | --- | --- |
| `UMAMI_BACKEND_ENABLED` | Μεταβλητή | όρισε `true` για ενεργοποίηση στατιστικών Worker backend |
| `UMAMI_BACKEND_HOST_URL` | Μεταβλητή | URL του Umami, για παράδειγμα `https://cloud.umami.is` |
| `UMAMI_BACKEND_WEBSITE_ID` | Μεταβλητή | Website ID του Umami για στατιστικά backend |
| `UMAMI_BACKEND_HOSTNAME` | Μεταβλητή | προαιρετικό όνομα host που εμφανίζεται στο Umami, π.χ. `api.example.com` |

Το backend Umami μπορεί επίσης να ρυθμιστεί στις ρυθμίσεις συστήματος. Οι μεταβλητές Worker υπερισχύουν των ρυθμίσεων συστήματος.

Μεταβλητές ειδοποιήσεων Telegram:

| Όνομα | Τύπος | Σκοπός |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Μυστικό | token bot του Telegram |
| `TELEGRAM_CHAT_ID` | Μεταβλητή | ID συνομιλίας, ομάδας ή καναλιού Telegram |

Μεταβλητές ειδοποιήσεων WxPusher:

| Όνομα | Τύπος | Σκοπός |
| --- | --- | --- |
| `WXPUSHER_APP_TOKEN` | Μυστικό | token εφαρμογής WxPusher |
| `WXPUSHER_UIDS` | Μεταβλητή | λίστα UID με κόμματα, απαραίτητη χωρίς ID θεμάτων |
| `WXPUSHER_TOPIC_IDS` | Μεταβλητή | λίστα ID θεμάτων με κόμματα, απαραίτητη χωρίς UID |

Χρονοπρογραμματισμός για αυτόματους ελέγχους και ειδοποιήσεις:

Για αυτόματο έλεγχο καναλιών, συλλογή χρήσης Workers ή αυτόματες ειδοποιήσεις απαιτείται Worker Cron Trigger. Προτείνεται `0 * * * *` (κάθε ώρα). Ο έλεγχος καναλιών έχει προεπιλογή 60 λεπτά και η συλλογή χρήσης 360 λεπτά. Οι αυτόματες ειδοποιήσεις απαιτούν επίσης ενεργό διακόπτη και ρυθμισμένο Telegram ή WxPusher.

## Ανάπτυξη 4: Ανάπτυξη Pages frontend

Στο Cloudflare Pages σύνδεσε το ίδιο GitHub repository.

Ρυθμίσεις build για Pages:

| Ρύθμιση | Τιμή |
| --- | --- |
| Framework preset | `React (Vite)` |
| Root directory | κενό ή `/` |
| Build command | `npm ci && npm run build:web` |
| Build output directory | `apps/web/dist` |

Αν το Cloudflare ζητήσει έκδοση Node.js για το build, πρόσθεσε τη μεταβλητή Pages `NODE_VERSION=20`.

Απαραίτητη μεταβλητή Pages:

```txt
VITE_API_BASE_URL=https://your-worker-domain.workers.dev
```

Προαιρετικές μεταβλητές Pages:

```txt
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
VITE_BACKGROUND_IMAGE_URL=https://example.com/background.jpg
VITE_UMAMI_SCRIPT_URL=https://cloud.umami.is/script.js
VITE_UMAMI_WEBSITE_ID=your-frontend-umami-website-id
VITE_UMAMI_HOST_URL=https://cloud.umami.is
```

Μετά την ανάπτυξη Pages, όρισε τη μεταβλητή Worker `APP_ORIGIN` στο Pages URL.

## Πρώτη ρύθμιση

Άνοιξε το Pages frontend URL. Στην πρώτη επίσκεψη εμφανίζεται η σελίδα ρύθμισης.

Χρειάζεσαι:

- `ADMIN_SETUP_SECRET`
- email super admin
- κωδικό πρόσβασης super admin
- όνομα ιστότοπου

Μετά τη δημιουργία του super admin, η σελίδα ρύθμισης κλείνει. Εγγραφή, επαλήθευση email και domain, έλεγχος QQ, Turnstile, ειδοποιήσεις Workers και Umami είναι προεπιλεγμένα ανενεργά.

## Επαλήθευση εγγραφής

Όταν είναι ενεργή η επαλήθευση email, η εγγραφή στέλνει 13-ψήφιο αριθμητικό κωδικό αντί για σύνδεσμο.

- Ο κωδικός ισχύει για 13 λεπτά.
- Κάθε κωδικός επιτρέπει 3 προσπάθειες εισαγωγής.
- Η επαναποστολή έχει αναμονή 67 δευτερολέπτων.
- Η εγγραφή, η επαλήθευση email, ο έλεγχος domain και ο έλεγχος προθέματος QQ είναι προεπιλεγμένα ανενεργά.
- Με ενεργό έλεγχο domain επιτρέπονται μόνο `qq.com`, `163.com`, `gmail.com`, `outlook.com`, `yeah.net`, `hotmail.com`, `126.com`, `foxmail.com`, `icloud.com`, `yahoo.com`, `sina.com` και `live.com`.
- Με ενεργό έλεγχο QQ, το τμήμα πριν από το `@` σε διεύθυνση `qq.com` πρέπει να περιέχει μόνο ψηφία.

## Στατιστικά Umami

Το frontend Umami καταγράφει επισκέψεις στην κονσόλα Pages. Ρύθμισέ το στις ρυθμίσεις συστήματος ή χρησιμοποίησε τις μεταβλητές Pages `VITE_UMAMI_SCRIPT_URL`, `VITE_UMAMI_WEBSITE_ID` και `VITE_UMAMI_HOST_URL`.

Το backend Umami στέλνει γεγονότα `backend_request` μέσω του επίσημου `POST /api/send`. Όταν ενεργοποιείται απαιτείται Website ID. Το κουμπί αποθήκευσης και δοκιμής στέλνει γεγονός `umami_test`.

Το backend tracking δεν στέλνει email χρήστη, API Key ή σώμα αιτήματος. Στέλνει μόνο κατηγορία διαδρομής, μέθοδο, status code και καθυστέρηση.

## Χρήση Workers και ειδοποιήσεις

Η παρακολούθηση χρήσης Workers απαιτεί Cloudflare Account ID και API Token. Αν λείπουν, το frontend εμφανίζει μήνυμα ρύθμισης.

Η σελίδα εμφανίζει:

- τρέχον ποσοστό χρήσης
- τρέχον ποσοστό υπολοίπου
- ημερήσιο όριο αιτημάτων
- χρονικό εύρος στιγμιότυπου

Το ποσοστό υπολογίζεται από τα Worker αιτήματα των τελευταίων 24 ωρών διαιρεμένα με `WORKERS_DAILY_REQUEST_LIMIT`. Η προεπιλογή είναι `100000`.

Η αυτόματη συλλογή γίνεται κάθε 6 ώρες και απαιτεί το παραπάνω Cron Trigger. Η αυτόματη αποστολή απαιτεί ενεργό διακόπτη ειδοποιήσεων. Η «άμεση συλλογή» στέλνει μήνυμα όταν έχει ρυθμιστεί Telegram ή WxPusher ακόμη και με ανενεργή αυτόματη αποστολή.

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

## Βασικό URL καναλιού

Στο κανάλι βάλε το version root του upstream API.

| Υπηρεσία | Βασικό URL καναλιού |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| Άλλες συμβατές υπηρεσίες | συνήθως `https://domain/v1` |

Ο έλεγχος καναλιού δημιουργεί πρώτα `/v1/chat/completions`, μετά δοκιμάζει συνηθισμένες καταλήξεις και τέλος το αρχικό URL. Αποθηκεύει το πλήρες επιτυχημένο URL και την καθυστέρηση για επόμενα αιτήματα. Ο συγχρονισμός μοντέλων συνεχίζει να χρησιμοποιεί Base URL συν `/v1/models`.

Ο διαχειριστής μπορεί να προσθέτει ή να κρύβει μαζικά μοντέλα του επιλεγμένου καναλιού. Το `-all` στη μαζική διαγραφή κρύβει όλα τα μοντέλα του καναλιού· η νέα προσθήκη ονομάτων τα ενεργοποιεί ξανά. Ο καθαρισμός αφαιρεί εγγραφές μοντέλων διαγραμμένων καναλιών.

Τα νέα API Key εμφανίζονται πλήρως και μπορούν να αντιγραφούν ή να διαγραφούν. Παλιά κλειδιά χωρίς αποθηκευμένο απλό κείμενο δεν ανακτώνται· δημιούργησε νέο αν εμφανίζεται μόνο το πρόθεμα. Οι απλοί χρήστες διαγράφονται, όχι όμως ο τρέχων χρήστης ή ο super admin.

## Αντιμετώπιση προβλημάτων

Αν το frontend δεν συνδέεται στο backend:

1. Έλεγξε τη μεταβλητή Pages `VITE_API_BASE_URL`.
2. Βεβαιώσου ότι δείχνει στο Worker URL και όχι στο Pages URL.
3. Κάνε ξανά deploy το Pages μετά από αλλαγή μεταβλητών Pages.
4. Έλεγξε το Worker binding `DB`.
5. Έλεγξε τη σύνδεση Worker `DB` και το `APP_ORIGIN`· στην πρώτη ρύθμιση και το `ADMIN_SETUP_SECRET`.

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
| `TELEGRAM_MESSAGE_THREAD_ID` | ID θέματος φόρουμ Telegram |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | ID θέματος άμεσων μηνυμάτων Telegram |
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
