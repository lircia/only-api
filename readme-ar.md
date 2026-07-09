# Only API

Only API هو بوابة API متوافقة مع OpenAI ويمكن نشرها على Cloudflare Workers و Pages. يحتوي المشروع على تسجيل الدخول، تسجيل المستخدمين، التحقق من البريد الإلكتروني، مفاتيح API، إدارة القنوات، ساحة النماذج، إحصاءات الاستخدام، فحص استخدام Workers، وإشعارات اختيارية عبر Telegram و WxPusher.

ملف التوثيق الإنجليزي الافتراضي هو [README.md](README.md). اللغات الأخرى: [الصينية](readme-zh.md) | [اليابانية](readme-ja.md) | [الألمانية](readme-de.md) | [الروسية](readme-ru.md) | [اليونانية](readme-el.md)

## بنية المشروع

| الغرض | المسار |
| --- | --- |
| واجهة Pages | `apps/web` |
| خلفية Worker | `apps/api/src/index.ts` |
| SQL الخاص بقاعدة D1 | `apps/api/migrations/0001_initial.sql` |
| الاعتماديات والسكربتات | `package.json` |

## الميزات

- الإعداد الأول ينشئ المدير الأعلى باستخدام `ADMIN_SETUP_SECRET`.
- وضع الاستخدام الشخصي يعطل التحقق من البريد افتراضيا. وضع عدة مستخدمين يفعله افتراضيا.
- مفاتيح API الجديدة تستخدم `oi-only-`. المفاتيح القديمة التي تم إنشاؤها سابقا تبقى صالحة.
- المسار `/v1/models` يعيد أسماء النماذج المفعلة في ساحة النماذج.
- ساحة النماذج تدعم تعديل اسم العرض والنسخ والإخفاء.
- التسجيل مع التحقق من البريد يستخدم رمزا رقميا من 13 رقما، صالحا لمدة 13 دقيقة، مع 3 محاولات إدخال، وإعادة إرسال بعد 67 ثانية.
- التحقق من لاحقة البريد وإجبار بادئة QQ الرقمية يمكن تبديلهما من إعدادات النظام، وهما مفعّلان افتراضيا.
- لكل قناة زر اختبار مستقل، والاختبار يزامن نماذج upstream من `/models`.
- صفحة الاستخدام تعرض 3 ساعات، يوم واحد، 7 أيام، 15 يوما، والإجمالي.
- إعدادات النظام تدعم إرسال رسائل اختبار عبر Telegram و WxPusher.

## النشر 1: خلفية Worker

أنشئ Worker في Cloudflare Workers & Pages ثم اربط هذا المستودع من GitHub.

| الإعداد | القيمة |
| --- | --- |
| المجلد الجذر | فارغ أو `/` |
| أمر البناء | `npm ci` |
| أمر النشر | `npx wrangler deploy apps/api/src/index.ts --name only-api-worker --compatibility-date 2024-12-01 --keep-vars` |

هذا المشروع لا يحتاج إلى `wrangler.toml`.

## النشر 2: قاعدة بيانات D1

أنشئ قاعدة D1. الاسم الموصى به للتثبيت الجديد:

```txt
only_api
```

يمكن استخدام اسم آخر لقاعدة D1، لكن اسم الربط في Worker يجب أن يكون:

```txt
DB
```

افتح لوحة D1 ونفذ كل SQL الموجود في الملف:

```txt
apps/api/migrations/0001_initial.sql
```

الجداول التي يتم إنشاؤها:

| الجدول | الغرض |
| --- | --- |
| `users` | المستخدمون والمديرون |
| `email_verifications` | رموز التحقق من البريد |
| `sessions` | جلسات تسجيل الدخول |
| `api_keys` | مفاتيح API للمستخدمين |
| `channels` | قنوات upstream |
| `model_catalog` | ساحة النماذج |
| `usage_logs` | سجلات استخدام الطلبات |
| `worker_usage_snapshots` | لقطات استخدام Workers |
| `system_settings` | إعدادات النظام |

## النشر 3: ربط Worker والمتغيرات

اربط D1 من إعدادات Worker.

| النوع | الاسم | القيمة |
| --- | --- | --- |
| قاعدة D1 | `DB` | قاعدة D1 الخاصة بك |

المتغيرات المطلوبة:

| الاسم | النوع | الملاحظة |
| --- | --- | --- |
| `APP_ORIGIN` | Variable | رابط واجهة Pages |
| `ADMIN_SETUP_SECRET` | Secret | مفتاح المدير للإعداد الأول |
| `JWT_SECRET` | Secret | سلسلة عشوائية طويلة |

المتغير الموصى به:

| الاسم | النوع | الملاحظة |
| --- | --- | --- |
| `API_PUBLIC_BASE_URL` | Variable | رابط Worker العام الذي يظهر في الواجهة |

متغيرات اختيارية:

| الاسم | النوع | الملاحظة |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Resend API Key |
| `RESEND_FROM` | Variable | مرسل البريد |
| `TURNSTILE_SECRET_KEY` | Secret | Turnstile Secret Key |
| `CF_ACCOUNT_ID` | Variable | معرف حساب Cloudflare |
| `CF_API_TOKEN` | Secret | Token لقراءة استخدام Workers |

المتغيرات المطلوبة للإشعارات:

| الاسم | النوع | الملاحظة |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram Bot Token |
| `TELEGRAM_CHAT_ID` | Variable | معرف دردشة أو مجموعة Telegram |
| `WXPUSHER_APP_TOKEN` | Secret | WxPusher AppToken |
| `WXPUSHER_UIDS` | Variable | WxPusher UIDs؛ مطلوب إذا لم يتم ضبط `WXPUSHER_TOPIC_IDS` |
| `WXPUSHER_TOPIC_IDS` | Variable | WxPusher Topic IDs؛ مطلوب إذا لم يتم ضبط `WXPUSHER_UIDS` |

## النشر 4: واجهة Pages

أنشئ مشروع Cloudflare Pages من نفس مستودع GitHub.

| الإعداد | القيمة |
| --- | --- |
| إعداد الإطار | `React (Vite)` |
| المجلد الجذر | فارغ أو `/` |
| أمر البناء | `npm ci && npm run build:web` |
| مجلد ناتج البناء | `apps/web/dist` |
| إصدار Node.js | `20` أو أعلى |

متغير Pages المطلوب:

```txt
VITE_API_BASE_URL=https://your-worker-domain
```

بعد نشر Pages، اضبط متغير Worker `APP_ORIGIN` على رابط Pages.

## الإعداد الأول واستخدام API

افتح رابط Pages وأدخل `ADMIN_SETUP_SECRET` والبريد وكلمة المرور واسم الموقع، ثم اختر وضع الاستخدام الشخصي أو وضع عدة مستخدمين.

## التحقق من البريد عند التسجيل

عند تفعيل التحقق من البريد، لن يتم إرسال رابط تحقق. بدلا من ذلك يتم إرسال رمز رقمي من 13 رقما إلى البريد.

- الرمز صالح لمدة 13 دقيقة.
- كل رمز يسمح بثلاث محاولات إدخال.
- صفحة إدخال الرمز تحتوي على زر إعادة الإرسال.
- إعادة الإرسال لها مهلة 67 ثانية.
- صفحة التسجيل تحتوي على حقل تأكيد كلمة المرور.
- التحقق من لاحقة البريد مفعل افتراضيا ويدعم مزودين معروفين مثل `qq.com` و `163.com` و `gmail.com` و `outlook.com` و `yeah.net` و `hotmail.com` و `126.com`.
- بريد `qq.com` يتطلب افتراضيا بادئة رقمية خاصة برقم QQ.
- يمكن للمدير تعطيل التحقق من اللاحقة أو شرط بادئة QQ الرقمية من إعدادات النظام.

رابط الأساس للعميل:

```txt
https://your-worker-domain/v1
```

رأس الطلب:

```http
Authorization: Bearer oi-only-...
```

إعدادات SillyTavern الموصى بها:

```txt
API type: OpenAI Compatible / Custom OpenAI-compatible
API Base URL: https://your-worker-domain/v1
API Key: مفتاح oi-only-... الكامل
Model: انسخ من ساحة النماذج
```

أمثلة Channel Base URL:

| المزود | Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |

## متغيرات دفع اختيارية متقدمة

هذه المتغيرات ليست مطلوبة للنشر العادي. هي مخصصة لمن يعرف موضوعات Telegram وتنسيق الرسائل ومعاينة الروابط أو سلوك الموضوعات المدفوعة في WxPusher.

| الاسم | النوع | الملاحظة |
| --- | --- | --- |
| `TELEGRAM_PARSE_MODE` | Variable | `HTML` أو `MarkdownV2` أو `Markdown` |
| `TELEGRAM_MESSAGE_THREAD_ID` | Variable | Thread ID لموضوع منتدى Telegram |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | Variable | Telegram Direct Messages Topic ID |
| `TELEGRAM_DISABLE_NOTIFICATION` | Variable | قيمة منطقية، إشعار صامت |
| `TELEGRAM_PROTECT_CONTENT` | Variable | قيمة منطقية، حماية المحتوى من إعادة التوجيه أو الحفظ |
| `TELEGRAM_LINK_PREVIEW_DISABLED` | Variable | قيمة منطقية، تعطيل معاينة الروابط |
| `WXPUSHER_URL` | Variable | رابط داخل الرسالة |
| `WXPUSHER_CONTENT_TYPE` | Variable | `1` نص، `2` HTML، `3` Markdown؛ الافتراضي `1` |
| `WXPUSHER_VERIFY_PAY_TYPE` | Variable | `0` بدون تحقق، `1` للمستخدمين المدفوعين فقط، `2` لغير المشتركين أو المنتهية اشتراكاتهم |

هذا المستودع غير مُصان إلى أجل غير مسمى.
