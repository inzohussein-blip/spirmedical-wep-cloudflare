# ☁️ دليل نشر Spir Medical على Cloudflare Workers

> النقل تمّ عبر **`@opennextjs/cloudflare`** (الطريقة الرسمية الحالية لتشغيل Next.js على Cloudflare Workers). تم **اختبار البناء فعلياً** في هذا المشروع: ✅ `next build` نجح (170 صفحة) + ✅ تحزيم الـ Worker نجح + ✅ `wrangler --dry-run` نجح.

---

## ⚠️ اقرأ هذا أولاً — حقيقة "الاستضافة المجانية"

بعد البناء الفعلي، حجم الـ Worker النهائي:

| القياس | القيمة | حدّ Free | حدّ Paid ($5/شهر) |
|---|---|---|---|
| حجم الـ Worker (مضغوط gzip) | **~4.0 MB** | ❌ **3 MB** | ✅ 10 MB |
| CPU لكل طلب | SSR ثقيل | ⚠️ 10ms فقط | ✅ حتى 30s |

**الخلاصة:** تطبيقك **أكبر من الباقة المجانية** (4 MB > 3 MB). لتشغيله تحتاج **Workers Paid بـ 5$/شهر** (يرفع الحدّ لـ 10 MB + 30s CPU). هذه أرخص خطة وتكفي بمراحل.

> 💡 خيار للبقاء على المجاني: تقليص الحزمة تحت 3 MB (إزالة توليد صور OG `/api/og` ≈ يوفّر ~0.7 MB، + code-splitting). صعب الوصول لـ 3 MB مع كل الميزات — أخبرني لو تريد المحاولة.

---

## 🗄️ قاعدة البيانات — تبقى على Supabase

**لم نُغيّر قاعدة البيانات.** المصادقة + الجداول الـ54+ + RLS + Realtime تبقى على Supabase. السبب:
- D1 = SQLite **بدون RLS** → كل أمان البيانات الطبية يحتاج إعادة كتابة في كود التطبيق (خطر عالٍ).
- Cloudflare **لا توفّر مصادقة مُدارة** بديلة لـ Supabase Auth.
- نقل 54+ جدول + Auth + Realtime + Storage = مشروع منفصل بأسابيع عمل.

Supabase يعمل بشكل ممتاز مع تطبيق على Cloudflare — هذا هو المعمار الصحيح. **"كل شيء في Cloudflare" تحقّق على مستوى الاستضافة + الـ API + الـ crons + الـ CDN.**

> لو أردت لاحقاً نقل قاعدة البيانات لـ D1 — نخطّط له كمرحلة منفصلة على دفعات.

---

## 📦 ما الذي تغيّر عن نسخة Vercel؟

| # | الملف | الحالة | السبب |
|---|---|---|---|
| F01 | `package.json` | ✏️ تعديل | إضافة `@opennextjs/cloudflare` + `wrangler` + scripts النشر، `engines.node` → `>=20` |
| F02 | `next.config.js` | ✏️ تعديل | تفعيل OpenNext dev + `serverComponentsExternalPackages` + تنظيف CSP (إزالة Vercel، إضافة PostHog/Sentry) + نقل redirects |
| F03 | `tsconfig.json` | ✏️ تعديل | استثناء `cloudflare/` و`.open-next/` من فحص الأنواع |
| F04 | `src/lib/rate-limit.ts` | ✏️ تعديل | إزالة `webpackIgnore` ليُحزَّم `@upstash/redis` داخل الـ Worker (ضروري لـ Cloudflare) |
| F05 | `.gitignore` | ✏️ تعديل | إضافة `.open-next/`، `.wrangler/`، `.dev.vars` |
| F06 | `wrangler.jsonc` | 🆕 جديد | إعداد الـ Worker الرئيسي |
| F07 | `open-next.config.ts` | 🆕 جديد | إعداد OpenNext |
| F08 | `public/_headers` | 🆕 جديد | كاش الأصول الثابتة |
| F09 | `.dev.vars.example` | 🆕 جديد | متغيّرات التشغيل المحلي على Workers |
| F10 | `cloudflare/cron-worker/*` | 🆕 جديد | Worker مستقل لِبدائل Vercel crons |
| F11 | `DEPLOY-CLOUDFLARE.md` | 🆕 جديد | هذا الدليل |

> `vercel.json` تُرك كما هو (Cloudflare تتجاهله — مفيد لو أردت نشراً مزدوجاً لاحقاً).

---

## 🚀 النشر — الطريقة الموصى بها (GitHub، بدون CLI)

تطابق أسلوب عملك (GitHub Web UI). تربط المستودع بـ Cloudflare ويُبنى تلقائياً عند كل push — تماماً مثل Vercel.

### 1) أنشئ المستودع وارفع الملفات
- أنشئ مستودع GitHub جديد (مثلاً `spirmedical-cloudflare`).
- ارفع كل محتوى هذا الـ ZIP (بدون `node_modules` — تُثبَّت تلقائياً).

### 2) فعّل Workers Paid (مرّة واحدة)
Cloudflare Dashboard → **Compute (Workers)** → **Plans** → فعّل **Workers Paid ($5/mo)**.

### 3) اربط المستودع بـ Cloudflare (التطبيق الرئيسي)
- Dashboard → **Workers & Pages** → **Create** → **Workers** → **Import a repository / Connect to Git**.
- اختر مستودعك. إعدادات البناء:
  - **Framework preset:** `Next.js`
  - **Build command:** `npx opennextjs-cloudflare build`
  - **Deploy command:** `npx wrangler deploy`
  - **Root directory:** `/` (الجذر)

### 4) أضف متغيّرات البيئة
في إعدادات الـ Worker → **Settings → Variables and Secrets**، أضف القيم (الجدول في الأسفل).
⚠️ المفاتيح السرّية أضِفها كـ **Secret** (مشفّرة): `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `CRON_SECRET`, `VAPID_PRIVATE_KEY`, إلخ.

### 5) انشر
احفظ → سيبدأ Cloudflare البناء والنشر. ستحصل على رابط `https://spirmedical-wep.<your-subdomain>.workers.dev`.

### 6) الدومين المخصص
في الـ Worker → **Settings → Domains & Routes** → **Add Custom Domain** → أدخل `spirmedical.iq` (أو `app.spirmedical.iq`).
> النطاق يجب أن يكون مُداراً عبر Cloudflare DNS.

---

## ⏰ نشر Cron Worker (بدائل Vercel crons)

الـ 3 مهام (`vercel.json` سابقاً) أصبحت في Worker مستقل داخل `cloudflare/cron-worker`.

### الطريقة A — GitHub (بدون CLI):
- Dashboard → **Workers & Pages** → **Create** → **Workers** → اربط **نفس المستودع**.
- **Root directory:** `cloudflare/cron-worker`
- **Deploy command:** `npx wrangler deploy`
- بعد النشر، في إعدادات هذا الـ Worker أضف:
  - `APP_URL` = رابط تطبيقك الرئيسي (مثل `https://spirmedical.iq`)
  - `CRON_SECRET` = **نفس** قيمة التطبيق الرئيسي (كـ Secret)
- الـ Cron Triggers تُضبط تلقائياً من `wrangler.jsonc`. تحقّق منها في **Settings → Triggers**.

### الطريقة B — CLI (مرّة واحدة):
```bash
cd cloudflare/cron-worker
npm install
npx wrangler secret put CRON_SECRET     # الصق نفس السرّ
# عدّل APP_URL داخل wrangler.jsonc أولاً
npx wrangler deploy
```

### الجداول (بتوقيت UTC ⚠️):
| Cron | المهمّة | الطريقة |
|---|---|---|
| `0 6 * * *` | `/api/cron/nursing-recurring` | GET |
| `0 8 * * *` | `/api/cron/appointment-reminders` | GET |
| `0 9 * * *` | `/api/notifications/process` | POST |

> **انتبه:** Cloudflare crons بتوقيت **UTC** فقط. العراق = UTC+3 → عدّل الأرقام لو أردت توقيتاً محلياً (مثلاً 6 صباحاً بغداد = `0 3 * * *`).
> الاختبار اليدوي: افتح `https://<cron-worker-url>/?job=0 6 * * *`.

---

## 🔑 متغيّرات البيئة الكاملة

| المتغيّر | النوع | مطلوب؟ |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Plain | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Plain | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔒 Secret | ✅ |
| `ENCRYPTION_KEY` | 🔒 Secret | ✅ (64 hex) |
| `NEXT_PUBLIC_SITE_URL` | Plain | ✅ |
| `NEXT_PUBLIC_SITE_TYPE` | Plain | `all` |
| `CRON_SECRET` | 🔒 Secret | للـ crons |
| `UPSTASH_REDIS_REST_URL` | Plain | اختياري (rate-limit) |
| `UPSTASH_REDIS_REST_TOKEN` | 🔒 Secret | اختياري |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Plain | للإشعارات |
| `VAPID_PRIVATE_KEY` | 🔒 Secret | للإشعارات |
| `VAPID_SUBJECT` | Plain | للإشعارات |
| `NEXT_PUBLIC_SENTRY_DSN` | Plain | اختياري |
| `NEXT_PUBLIC_POSTHOG_KEY` | Plain | اختياري |
| `NEXT_PUBLIC_POSTHOG_HOST` | Plain | اختياري |
| `RESEND_API_KEY` | 🔒 Secret | للإيميل |
| `RESEND_FROM_EMAIL` | Plain | للإيميل |
| `WHATSAPP_*` / `META_*` / `TWILIO_*` | حسب المزوّد | للواتساب |

---

## 🧪 التطوير المحلي

```bash
npm install
npm run dev          # تطوير Next.js عادي (الأسرع) — يقرأ .env.local
npm run preview      # محاكاة Workers محلياً — يقرأ .dev.vars
npm run deploy       # بناء + نشر لـ Cloudflare (يحتاج wrangler login)
```
> للمعاينة المحلية على Workers: `cp .dev.vars.example .dev.vars` واملأ القيم.

---

## ⚠️ نقاط تحتاج تأكيداً بعد أول نشر

تم اختبار **البناء والتحزيم** بنجاح. النقاط التالية تعتمد على بيئة التشغيل الحيّة — راقبها بعد أول نشر:

1. **🔔 إشعارات Push (`web-push`):** حُزِّمت بنجاح وتعمل عبر `nodejs_compat`. لكن `web-push` يستخدم `node:https` — لو فشل الإرسال على Workers، البديل: استخدام Web Push عبر `fetch` مباشرة (VAPID + Web Crypto). أخبرني لو ظهرت مشكلة.
2. **🖼️ تحسين الصور (`next/image`):** يعمل عبر OpenNext، لكن لو لاحظت بطئاً/أخطاء في الصور، الحل: `images: { unoptimized: true }` في `next.config.js` أو استخدام Cloudflare Images.
3. **🛡️ Rate Limiting:** الذاكرة (in-memory) غير موثوقة على Workers (كل isolate منفصل). للإنتاج اضبط `UPSTASH_REDIS_*` (مجاني، يعمل ممتاز على Workers) — وقد جعلناه يُحزَّم تلقائياً.
4. **CSP:** نظّفنا نطاقات Vercel وأضفنا PostHog/Sentry. لو حُجب أي script/طلب، أضِف نطاقه في `next.config.js`.

---

## 📊 Vercel ↔ Cloudflare

| الميزة | Vercel | Cloudflare Workers |
|---|---|---|
| الاستضافة | Serverless | Workers (Edge) |
| Crons | `vercel.json` | Cron Worker مستقل |
| التحليلات | `@vercel/analytics` (لا تعمل هنا) | PostHog / Sentry |
| المناطق | fra1 | شبكة Cloudflare العالمية |
| التكلفة | حسب الاستخدام | **$5/شهر** (Workers Paid) |

> `@vercel/analytics` و`@vercel/speed-insights` تُركت في `layout.tsx` (لا تضرّ، لكنها لا تُرسل بيانات على Cloudflare). يمكن حذفها لاحقاً.

---

## 🆘 استكشاف الأخطاء

| الخطأ | الحل |
|---|---|
| `Worker exceeded size limit` | فعّل Workers Paid (10 MB)، أو قلّص الحزمة |
| `Could not resolve "X"` | أضِف الحزمة لـ `serverComponentsExternalPackages` في `next.config.js` |
| الصور لا تظهر | `images.unoptimized = true` |
| Cron لا يعمل | تحقّق من تطابق `CRON_SECRET` + توقيت UTC + الـ Triggers في Dashboard |
| فشل المصادقة | تأكّد من `NEXT_PUBLIC_SUPABASE_*` + `SUPABASE_SERVICE_ROLE_KEY` |
