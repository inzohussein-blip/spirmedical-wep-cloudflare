import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// ════════════════════════════════════════════════════════════════
// ☁️ OpenNext — إعداد Cloudflare
// الافتراضي: cache داخل الـ Worker (in-memory).
// لتفعيل ISR/cache مستمر عبر R2 لاحقاً، راجِع:
//   https://opennext.js.org/cloudflare/caching
// ════════════════════════════════════════════════════════════════
export default defineCloudflareConfig({});
