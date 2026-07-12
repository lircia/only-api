# Only API

Only API هو بوابة API متوافقة مع OpenAI ويمكن نشرها على Cloudflare Workers + Pages. يحتوي المشروع على خلفية Worker، وواجهة Pages، وقاعدة D1، وتسجيل دخول المستخدمين، والتسجيل، وتوزيع API Key، وإدارة القنوات، وساحة النماذج، وإحصاءات الاستخدام، ومراقبة استخدام Workers، وتنبيهات اختيارية عبر Telegram أو WxPusher، وإحصاءات Umami اختيارية.

قد تعاني الاستدعاءات المباشرة إلى upstream API من تأخير مرتفع أو فشل في الاتصال عندما تكون عقد الخدمة بعيدة أو يكون مسار الشبكة غير مستقر. يمرر Only API الطلبات عبر Cloudflare، وقد يحسن الاتصال في مثل هذه الحالات. ويمكنه أيضا جمع عدة مزودين متوافقين مع OpenAI خلف عنوان API واحد، بحيث يصل العميل إلى نماذج القنوات المختلفة من خلال عنوان واحد.

نحن لا نوفر أي API Key ولا أي رابط API علوي. هذه المنصة مخصصة فقط لتمرير API.

يمكنك استخدام خدمة تحسين نطاق Cloudflare أو preferred-IP لتحسين السرعة. الواجهة الأمامية لا تستدعي المزودين العلويين مباشرة، لذلك لا تحتاج عادة إلى تحسين نطاق الواجهة الأمامية. يمكنك العثور على روابط التحسين من خلال البحث على الويب.

هذا المستودع مناسب للاستضافة على GitHub والنشر من لوحة Cloudflare. لا يستخدم المشروع `wrangler.toml`.

## اللغات

- [English](README.md)
- [中文](readme-zh.md)
- [日本語](readme-ja.md)
- [Deutsch](readme-de.md)
- [Русский](readme-ru.md)
- [Ελληνικά](readme-el.md)

## مسارات المشروع

| الغرض | المسار |
| --- | --- |
| واجهة Pages | `apps/web` |
| خلفية Worker | `apps/api/src/index.ts` |
| SQL الخاص بقاعدة D1 | `apps/api/migrations/0001_initial.sql` |
| ملف الاعتماديات | `package.json` |

## الميزات الرئيسية

- إعداد أول مدير فائق باستخدام `ADMIN_SETUP_SECRET`.
- التسجيل، والتحقق برمز البريد، والتحقق من لاحقة البريد، والتحقق من بادئة QQ الرقمية، وTurnstile مفاتيح مستقلة ومعطلة افتراضيا.
- دعم اختياري لـ Cloudflare Turnstile. Frontend Site Key يوضع في متغير Pages، وBackend Secret Key يوضع في متغير Worker.
- مفاتيح API للمستخدمين تستخدم البادئة `oi-only-` ويمكن عرضها كاملة ونسخها وحذفها.
- تمرير متوافق مع OpenAI لمسار `/v1/*`.
- لا توجد حدود استخدام للمستخدمين.
- اختبار مستقل لكل قناة يجرب عدة روابط، ويسجل الرابط الناجح وزمن الاستجابة، ويزامن النماذج من `/models`.
- ساحة النماذج تدعم الطي، وتعديل الأسماء، والإضافة والحذف الجماعي حسب القناة، و`-all` لحذف الكل، وتنظيف النماذج المتبقية.
- يستطيع المدير تعديل حالة المستخدم ودوره وحذف المستخدمين العاديين؛ لا يمكن حذف المستخدم الحالي أو المدير الفائق.
- إحصاءات استخدام لمدة 3 ساعات، ويوم واحد، و7 أيام، و15 يوما، وإجمالي الاستخدام.
- صفحة استخدام Workers تعرض نسبة الاستخدام والنسبة المتبقية.
- بعد ضبط Worker Cron Trigger، يتم فحص استخدام Workers افتراضيا كل 6 ساعات ويمكن إرساله إلى Telegram أو WxPusher.
- دعم إحصاءات Umami اختيارية بشكل منفصل لواجهة Pages وخلفية Worker.
- عرض الوقت في الواجهة الأمامية مضبوط على UTC+8.
- سمات مدمجة: أسود وأبيض، أزرق فاتح وأبيض، أصفر وبنفسجي، أخضر وأحمر، وردي وبرتقالي.
- صورة خلفية اختيارية للواجهة الأمامية عبر URL.

## النشر 1: نشر Worker

في Cloudflare Workers & Pages، أنشئ مشروع Worker أو افتحه، ثم اربط مستودع GitHub هذا.

إعدادات بناء Worker:

| الإعداد | القيمة |
| --- | --- |
| Root directory | فارغ أو `/` |
| Build command | `npm ci` |
| Deploy command | `npx wrangler deploy apps/api/src/index.ts --name only-api-worker --compatibility-date 2024-12-01 --keep-vars` |

يحافظ `--keep-vars` على متغيرات البيئة العادية في اللوحة فقط. تحفظ Cloudflare الأسرار بشكل منفصل، لكنه لا يعلن ربط D1 ولا يضمن بقاءه. لأن المستودع لا يستخدم ملف إعداد Wrangler، انشر دائما إلى Worker بالاسم نفسه وافحص ربط `DB` بعد كل تحديث. إذا اختفى، فأعد ربط قاعدة D1 الحالية ولا تنشئ قاعدة جديدة.

## النشر 2: إنشاء قاعدة D1

أنشئ قاعدة D1 في لوحة Cloudflare.

الاسم الموصى به للقاعدة:

```txt
only_api
```

اسم ربط Worker يجب أن يكون:

```txt
DB
```

افتح وحدة تحكم D1 ونفذ كل SQL من الملف:

```txt
apps/api/migrations/0001_initial.sql
```

الجداول التي ينشئها SQL:

| الجدول | الغرض |
| --- | --- |
| `users` | المستخدمون والمديرون والمديرون الفائقون |
| `email_verifications` | رموز تحقق البريد من 13 رقما |
| `sessions` | جلسات تسجيل الدخول |
| `api_keys` | مفاتيح API للمستخدمين |
| `channels` | قنوات API العلوية |
| `model_catalog` | نماذج ساحة النماذج |
| `usage_logs` | سجلات استخدام تمرير API |
| `worker_usage_snapshots` | لقطات استخدام Workers |
| `system_settings` | إعدادات النظام |

## النشر 3: ربط موارد ومتغيرات Worker

اربط D1 في إعدادات Worker:

| النوع | الاسم | القيمة |
| --- | --- | --- |
| D1 database | `DB` | قاعدة D1 الخاصة بك |

متغير Worker الضروري للإعداد الأول:

| الاسم | النوع | الغرض |
| --- | --- | --- |
| `ADMIN_SETUP_SECRET` | سر | كلمة مرور إعداد أول مدير فائق |

بعد إنشاء المدير الفائق، لا يعود مسار الإعداد يقرأ `ADMIN_SETUP_SECRET` ويمكن حذفه أو تغييره.

متغيرات Worker الموصى بها:

| الاسم | النوع | الغرض |
| --- | --- | --- |
| `APP_ORIGIN` | متغير | رابط Pages لتقييد CORS؛ من دونه تستخدم القيمة `*` |
| `API_PUBLIC_BASE_URL` | متغير | رابط Worker العام الذي يظهر في الواجهة |

متغيرات البريد الاختيارية:

| الاسم | النوع | الغرض |
| --- | --- | --- |
| `RESEND_API_KEY` | سر | مفتاح Resend API |
| `RESEND_FROM` | متغير | المرسل، مثل `Only API <noreply@example.com>` |

عند تفعيل تحقق البريد، يجب ضبط متغيري البريد معا.

متغير Turnstile الاختياري في Worker:

| الاسم | النوع | الغرض |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | سر | مفتاح Cloudflare Turnstile السري |

عند تفعيل Turnstile، يلزم هذا السر في Worker ومتغير Pages المسمى `VITE_TURNSTILE_SITE_KEY`.

متغيرات استخدام Workers الاختيارية:

| الاسم | النوع | الغرض |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | متغير | معرف حساب Cloudflare |
| `CF_API_TOKEN` | سر | رمز API يستطيع قراءة استخدام Workers |
| `WORKERS_DAILY_REQUEST_LIMIT` | متغير | حد الطلبات اليومي لحساب النسبة، الافتراضي `100000` |

الأسماء البديلة المقبولة هي `CLOUDFLARE_ACCOUNT_ID` و`CF_ACCOUNT_TAG` و`CLOUDFLARE_ACCOUNT_TAG` و`CF_ZONE_ID` و`CLOUDFLARE_ZONE_ID` و`CLOUDFLARE_API_TOKEN` و`CF_TOKEN` و`CLOUDFLARE_TOKEN`.

متغيرات Umami الخلفية الاختيارية:

| الاسم | النوع | الغرض |
| --- | --- | --- |
| `UMAMI_BACKEND_ENABLED` | متغير | ضع `true` لتفعيل تتبع خلفية Worker |
| `UMAMI_BACKEND_HOST_URL` | متغير | رابط مضيف Umami، مثل `https://cloud.umami.is` |
| `UMAMI_BACKEND_WEBSITE_ID` | متغير | معرف موقع Umami لتتبع الخلفية |
| `UMAMI_BACKEND_HOSTNAME` | متغير | اسم مضيف اختياري يظهر في Umami، مثل `api.example.com` |

يمكن ضبط Umami الخلفية أيضا من إعدادات النظام. متغيرات Worker تتجاوز إعدادات النظام.

متغيرات تنبيه Telegram:

| الاسم | النوع | الغرض |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | سر | رمز روبوت Telegram |
| `TELEGRAM_CHAT_ID` | متغير | معرف محادثة أو مجموعة أو قناة Telegram |

متغيرات تنبيه WxPusher:

| الاسم | النوع | الغرض |
| --- | --- | --- |
| `WXPUSHER_APP_TOKEN` | سر | رمز تطبيق WxPusher |
| `WXPUSHER_UIDS` | متغير | قائمة UID مفصولة بفواصل، مطلوبة إذا لم تستخدم معرفات الموضوع |
| `WXPUSHER_TOPIC_IDS` | متغير | قائمة معرفات الموضوع مفصولة بفواصل، مطلوبة إذا لم تستخدم UID |

المشغل المجدول المطلوب للفحص والتنبيه التلقائي:

يلزم إضافة Worker Cron Trigger للفحص التلقائي للقنوات أو جمع استخدام Workers أو إرسال التنبيهات تلقائيا. التعبير الموصى به هو `0 * * * *`، أي مرة كل ساعة. فحص القنوات افتراضيا كل 60 دقيقة وجمع الاستخدام كل 360 دقيقة. ويتطلب التنبيه التلقائي أيضا تفعيل مفتاح التنبيه وضبط Telegram أو WxPusher.

## النشر 4: نشر واجهة Pages

في Cloudflare Pages، اربط نفس مستودع GitHub.

إعدادات بناء Pages:

| الإعداد | القيمة |
| --- | --- |
| Framework preset | `React (Vite)` |
| Root directory | فارغ أو `/` |
| Build command | `npm ci && npm run build:web` |
| Build output directory | `apps/web/dist` |

إذا طلبت Cloudflare إصدار Node.js للبناء، فأضف متغير بناء Pages التالي: `NODE_VERSION=20`.

متغير Pages الضروري:

```txt
VITE_API_BASE_URL=https://your-worker-domain.workers.dev
```

متغيرات Pages الاختيارية:

```txt
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
VITE_BACKGROUND_IMAGE_URL=https://example.com/background.jpg
VITE_UMAMI_SCRIPT_URL=https://cloud.umami.is/script.js
VITE_UMAMI_WEBSITE_ID=your-frontend-umami-website-id
VITE_UMAMI_HOST_URL=https://cloud.umami.is
```

بعد نشر Pages، اضبط متغير Worker `APP_ORIGIN` على رابط Pages.

## الإعداد الأول

افتح رابط واجهة Pages. في الزيارة الأولى ستظهر صفحة الإعداد.

تحتاج إلى:

- `ADMIN_SETUP_SECRET`
- بريد المدير الفائق
- كلمة مرور المدير الفائق
- اسم الموقع

بعد إنشاء المدير الفائق، تغلق صفحة الإعداد. التسجيل، وتحقق البريد واللاحقة وQQ، وTurnstile، وتنبيهات Workers، وUmami كلها معطلة افتراضيا.

## التحقق من التسجيل

عند تفعيل تحقق البريد، لا يرسل التسجيل رابط تحقق، بل يرسل رمزا رقميا من 13 رقما.

- الرمز صالح لمدة 13 دقيقة.
- كل رمز يسمح بثلاث محاولات إدخال.
- إعادة الإرسال لها انتظار 67 ثانية.
- التسجيل، وتحقق البريد، وتحقق اللاحقة، وتحقق بادئة QQ الرقمية كلها معطلة افتراضيا.
- عند تفعيل تحقق اللاحقة يسمح فقط بالنطاقات `qq.com` و`163.com` و`gmail.com` و`outlook.com` و`yeah.net` و`hotmail.com` و`126.com` و`foxmail.com` و`icloud.com` و`yahoo.com` و`sina.com` و`live.com`.
- عند تفعيل تحقق QQ، يجب أن يكون الجزء السابق لـ `@` في عنوان `qq.com` أرقاما فقط.

## إحصاءات Umami

Umami للواجهة الأمامية يسجل زيارات لوحة Pages. يمكنك ضبطه في إعدادات النظام، أو استخدام متغيرات Pages `VITE_UMAMI_SCRIPT_URL` و`VITE_UMAMI_WEBSITE_ID` و`VITE_UMAMI_HOST_URL`.

يرسل Umami للخلفية أحداث `backend_request` عبر الواجهة الرسمية `POST /api/send`. يلزم Website ID عند التفعيل، ويرسل زر الحفظ والاختبار حدث `umami_test`.

تتبع الخلفية لا يرسل بريد المستخدم ولا API Key ولا جسم الطلب. يرسل فقط فئة المسار، وطريقة الطلب، ورمز الحالة، وزمن الاستجابة.

## استخدام Workers والتنبيهات

مراقبة استخدام Workers تحتاج إلى متغير Cloudflare Account ID ومتغير API Token. إذا كانت ناقصة، تعرض الواجهة رسالة إعداد.

تعرض الصفحة:

- نسبة الاستخدام الحالية
- النسبة المتبقية الحالية
- حد الطلبات اليومي
- نطاق وقت اللقطة

تحسب النسبة من عدد طلبات Worker في آخر 24 ساعة مقسوما على `WORKERS_DAILY_REQUEST_LIMIT`. القيمة الافتراضية هي `100000`.

يتم الجمع التلقائي كل 6 ساعات ويتطلب Cron Trigger المذكور أعلاه. ويتطلب الدفع التلقائي تفعيل مفتاح التنبيه. يرسل زر "اجمع الآن" رسالة فورية عند ضبط Telegram أو WxPusher حتى لو كان الدفع التلقائي معطلا.

## استخدام API

Client Base URL:

```txt
https://your-worker-domain.workers.dev/v1
```

Header:

```http
Authorization: Bearer oi-only-...
```

إعدادات SillyTavern الموصى بها:

```txt
API type: OpenAI Compatible / Custom OpenAI-compatible
API Base URL: https://your-worker-domain.workers.dev/v1
API Key: المفتاح الكامل oi-only-...
Model: اسم نموذج منسوخ من ساحة النماذج
```

## رابط القناة الأساسي

أدخل في القناة جذر إصدار API العلوي.

| الخدمة | رابط القناة الأساسي |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| خدمات متوافقة أخرى | غالبا `https://domain/v1` |

ينشئ اختبار القناة أولا `/v1/chat/completions`، ثم يجرب النهايات الشائعة، وأخيرا الرابط الأصلي. يحفظ الرابط الكامل الناجح وزمن الاستجابة لاستخدامهما في طلبات الإكمال. وتظل مزامنة النماذج تستخدم الرابط الأساسي مع `/v1/models`.

يمكن للمدير إضافة نماذج القناة المختارة أو إخفاؤها جماعيا. يؤدي إدخال `-all` في الحذف الجماعي إلى إخفاء كل نماذج القناة، ويمكن تفعيلها مجددا بإضافة أسمائها. ويحذف التنظيف سجلات نماذج القنوات المحذوفة.

تعرض مفاتيح API الجديدة كاملة ويمكن نسخها أو حذفها. لا يمكن استعادة المفاتيح القديمة التي لم يحفظ نصها؛ أنشئ مفتاحا جديدا إذا ظهر الجزء الأول فقط. يمكن حذف المستخدمين العاديين، ولا يمكن حذف المستخدم الحالي أو المدير الفائق.

## استكشاف الأخطاء

إذا لم تتصل الواجهة بالخلفية:

1. افحص متغير Pages باسم `VITE_API_BASE_URL`.
2. تأكد أنه يشير إلى رابط Worker وليس رابط Pages.
3. أعد نشر Pages بعد تغيير متغيرات Pages.
4. افحص ربط Worker باسم `DB`.
5. افحص ربط `DB` في Worker و`APP_ORIGIN`، وافحص `ADMIN_SETUP_SECRET` عند الإعداد الأول.

إذا أظهر SillyTavern رسالة Unauthorized:

1. استخدم المفتاح الكامل، وليس البادئة الظاهرة فقط.
2. استخدم وضع OpenAI Compatible أو Custom OpenAI-compatible.
3. تأكد من عدم وجود مسافات قبل المفتاح أو بعده.
4. تأكد أن اسم النموذج المختار موجود في ساحة النماذج.

## متغيرات اختيارية متقدمة

هذه المتغيرات ليست ضرورية للنشر العادي.

| الاسم | الغرض |
| --- | --- |
| `TELEGRAM_PARSE_MODE` | `HTML` أو `MarkdownV2` أو `Markdown` |
| `TELEGRAM_MESSAGE_THREAD_ID` | معرف موضوع منتدى Telegram |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | معرف موضوع الرسائل الخاصة في Telegram |
| `TELEGRAM_DISABLE_NOTIFICATION` | تنبيه Telegram صامت |
| `TELEGRAM_PROTECT_CONTENT` | حماية رسالة Telegram من الحفظ أو إعادة التوجيه |
| `TELEGRAM_LINK_PREVIEW_DISABLED` | تعطيل معاينة روابط Telegram |
| `WXPUSHER_URL` | رابط مرفق برسالة WxPusher |
| `WXPUSHER_CONTENT_TYPE` | `1` نص، `2` HTML، `3` Markdown |
| `WXPUSHER_VERIFY_PAY_TYPE` | فلتر المستخدمين المدفوعين في WxPusher |
| `CF_WORKERS_DAILY_REQUEST_LIMIT` | اسم بديل للحد اليومي |
| `CLOUDFLARE_WORKERS_DAILY_REQUEST_LIMIT` | اسم بديل للحد اليومي |

إخلاء المسؤولية: هذا المشروع مجرد أداة لتمرير API. أنت مسؤول عن API Key العلوي، وشروط المزود، والتكاليف، والامتثال القانوني.
هذا المستودع غير مُصان إلى أجل غير مسمى.
