# Only API

Only API هو بوابة API متوافقة مع OpenAI ويمكن نشرها على Cloudflare Workers + Pages. يحتوي المشروع على خلفية Worker، وواجهة Pages، وقاعدة D1، وتسجيل دخول المستخدمين، والتسجيل، وتوزيع API Key، وإدارة القنوات، وساحة النماذج، وإحصاءات الاستخدام، ومراقبة استخدام Workers، وتنبيهات اختيارية عبر Telegram أو WxPusher.

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
- وضع الاستخدام الشخصي ووضع تعدد المستخدمين.
- مفتاح التسجيل، والتحقق برمز البريد، وتأكيد كلمة المرور، والتحقق من لاحقة البريد، والتحقق من بادئة QQ الرقمية.
- دعم اختياري لـ Cloudflare Turnstile. Frontend Site Key يوضع في متغير Pages، وBackend Secret Key يوضع في متغير Worker.
- مفاتيح API للمستخدمين تستخدم البادئة `oi-only-`.
- تمرير متوافق مع OpenAI لمسار `/v1/*`.
- لا توجد حدود استخدام للمستخدمين.
- اختبار القنوات ومزامنة النماذج من upstream `/models`.
- ساحة النماذج تعرض نموذجا واحدا في كل صف، مع إمكانية تعديل اسم العرض وإخفاء النماذج.
- إحصاءات استخدام لمدة 3 ساعات، ويوم واحد، و7 أيام، و15 يوما، وإجمالي الاستخدام.
- صفحة استخدام Workers تعرض نسبة الاستخدام والنسبة المتبقية.
- يتم فحص استخدام Workers افتراضيا كل 6 ساعات، ويمكن إرساله إلى Telegram أو WxPusher.
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

يساعد `--keep-vars` على إبقاء المتغيرات والأسرار التي ضبطتها في لوحة Cloudflare. إذا اختفت المتغيرات أو ربط D1 بعد التحديث، فتأكد أنك تعيد نشر نفس Worker وليس إنشاء Worker جديد، ثم افحص صفحة الربط في Worker مرة أخرى.

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

متغيرات Worker الضرورية:

| الاسم | النوع | الغرض |
| --- | --- | --- |
| `APP_ORIGIN` | Variable | رابط واجهة Pages |
| `ADMIN_SETUP_SECRET` | Secret | كلمة مرور إعداد أول مدير فائق |
| `JWT_SECRET` | Secret | نص عشوائي طويل للجلسات |

متغير Worker موصى به:

| الاسم | النوع | الغرض |
| --- | --- | --- |
| `API_PUBLIC_BASE_URL` | Variable | رابط Worker العام الذي يظهر في الواجهة |

متغيرات البريد الاختيارية:

| الاسم | النوع | الغرض |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Resend API Key |
| `RESEND_FROM` | Variable | المرسل، مثل `Only API <noreply@example.com>` |

متغير Turnstile الاختياري في Worker:

| الاسم | النوع | الغرض |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | Secret | Cloudflare Turnstile Secret Key |

متغيرات استخدام Workers الاختيارية:

| الاسم | النوع | الغرض |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | Variable | Cloudflare Account ID |
| `CF_API_TOKEN` | Secret | API Token يستطيع قراءة استخدام Workers |
| `WORKERS_DAILY_REQUEST_LIMIT` | Variable | حد الطلبات اليومي لحساب النسبة، الافتراضي `100000` |

الأسماء البديلة المقبولة هي `CLOUDFLARE_ACCOUNT_ID` و`CF_ACCOUNT_TAG` و`CLOUDFLARE_ACCOUNT_TAG` و`CF_ZONE_ID` و`CLOUDFLARE_ZONE_ID` و`CLOUDFLARE_API_TOKEN` و`CF_TOKEN` و`CLOUDFLARE_TOKEN`.

متغيرات تنبيه Telegram:

| الاسم | النوع | الغرض |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Variable | معرف محادثة أو مجموعة أو قناة Telegram |

متغيرات تنبيه WxPusher:

| الاسم | النوع | الغرض |
| --- | --- | --- |
| `WXPUSHER_APP_TOKEN` | Secret | WxPusher AppToken |
| `WXPUSHER_UIDS` | Variable | قائمة UID مفصولة بفواصل، مطلوبة إذا لم تستخدم Topic IDs |
| `WXPUSHER_TOPIC_IDS` | Variable | قائمة Topic ID مفصولة بفواصل، مطلوبة إذا لم تستخدم UIDs |

مشغل مجدول اختياري:

يمكنك إضافة Worker Cron Trigger من لوحة Cloudflare، مثل التشغيل كل ساعة. التطبيق نفسه لا يجري فحص استخدام Workers إلا عند وصول الفاصل الزمني المضبوط. الفاصل الافتراضي هو 360 دقيقة.

## النشر 4: نشر واجهة Pages

في Cloudflare Pages، اربط نفس مستودع GitHub.

إعدادات بناء Pages:

| الإعداد | القيمة |
| --- | --- |
| Framework preset | `React (Vite)` |
| Root directory | فارغ أو `/` |
| Build command | `npm ci && npm run build:web` |
| Build output directory | `apps/web/dist` |
| Node.js version | `20` أو أعلى |

متغير Pages الضروري:

```txt
VITE_API_BASE_URL=https://your-worker-domain.workers.dev
```

متغيرات Pages الاختيارية:

```txt
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
VITE_BACKGROUND_IMAGE_URL=https://example.com/background.jpg
```

بعد نشر Pages، اضبط متغير Worker `APP_ORIGIN` على رابط Pages.

## الإعداد الأول

افتح رابط واجهة Pages. في الزيارة الأولى ستظهر صفحة الإعداد.

تحتاج إلى:

- `ADMIN_SETUP_SECRET`
- بريد المدير الفائق
- كلمة مرور المدير الفائق
- اسم الموقع
- وضع الاستخدام الشخصي أو وضع تعدد المستخدمين

بعد إنشاء المدير الفائق، تغلق صفحة الإعداد ولا يعود سر الإعداد مستخدما في مسار إعداد الواجهة الأمامية.

## التحقق من التسجيل

عند تفعيل تحقق البريد، لا يرسل التسجيل رابط تحقق، بل يرسل رمزا رقميا من 13 رقما.

- الرمز صالح لمدة 13 دقيقة.
- كل رمز يسمح بثلاث محاولات إدخال.
- إعادة الإرسال لها انتظار 67 ثانية.
- وضع الاستخدام الشخصي يعطل تحقق البريد افتراضيا.
- وضع تعدد المستخدمين يفعل تحقق البريد افتراضيا.
- تحقق لاحقة البريد وتحقق بادئة QQ الرقمية مفعلان افتراضيا.

## استخدام Workers والتنبيهات

مراقبة استخدام Workers تحتاج إلى متغير Cloudflare Account ID ومتغير API Token. إذا كانت ناقصة، تعرض الواجهة رسالة إعداد.

تعرض الصفحة:

- نسبة الاستخدام الحالية
- النسبة المتبقية الحالية
- حد الطلبات اليومي
- نطاق وقت اللقطة

تحسب النسبة من عدد طلبات Worker في آخر 24 ساعة مقسوما على `WORKERS_DAILY_REQUEST_LIMIT`. القيمة الافتراضية هي `100000`.

الفحص التلقائي يتم افتراضيا كل 6 ساعات. عند الضغط على "اجمع الآن"، يتم إرسال تنبيه فوري أيضا إذا كانت متغيرات Telegram أو WxPusher مضبوطة.

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

## Channel Base URL

أدخل في القناة جذر إصدار API العلوي.

| الخدمة | Channel Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| خدمات متوافقة أخرى | غالبا `https://domain/v1` |

الخلفية تصحح النهايات الشائعة تلقائيا، مثل `/v1` و`/v1/` و`/v1/chat` و`/v1/chat/completions`.

## استكشاف الأخطاء

إذا لم تتصل الواجهة بالخلفية:

1. افحص متغير Pages باسم `VITE_API_BASE_URL`.
2. تأكد أنه يشير إلى رابط Worker وليس رابط Pages.
3. أعد نشر Pages بعد تغيير متغيرات Pages.
4. افحص ربط Worker باسم `DB`.
5. افحص متغيرات Worker وهي `APP_ORIGIN` و`ADMIN_SETUP_SECRET` و`JWT_SECRET`.

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
| `TELEGRAM_MESSAGE_THREAD_ID` | Telegram forum topic thread ID |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | Telegram direct message topic ID |
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
