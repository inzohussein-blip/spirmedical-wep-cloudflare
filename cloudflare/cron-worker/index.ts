/**
 * ════════════════════════════════════════════════════════════════
 * ☁️ Spir Medical — Cloudflare Cron Worker
 * ════════════════════════════════════════════════════════════════
 * يستبدل Vercel Crons. يعمل على Cloudflare Cron Triggers ويستدعي
 * نقاط النهاية في التطبيق الرئيسي عبر fetch مع CRON_SECRET.
 *
 * الجداول (UTC — لاحظ أن Cloudflare cron يعمل بتوقيت UTC):
 *   0 6 * * *  → GET  /api/cron/nursing-recurring
 *   0 8 * * *  → GET  /api/cron/appointment-reminders
 *   0 9 * * *  → POST /api/notifications/process
 *
 * النشر:
 *   cd cloudflare/cron-worker
 *   npm install
 *   npx wrangler secret put CRON_SECRET   # نفس قيمة التطبيق الرئيسي
 *   npx wrangler deploy
 * ════════════════════════════════════════════════════════════════
 */

export interface Env {
  /** رابط التطبيق الرئيسي على Cloudflare (workers.dev أو دومين مخصص) */
  APP_URL: string;
  /** نفس CRON_SECRET المضبوط في التطبيق الرئيسي */
  CRON_SECRET: string;
}

type Job = { path: string; method: "GET" | "POST" };

// خريطة: تعبير الـ cron (مطابق حرفياً لِما في wrangler.jsonc) → المهمّة
const JOBS: Record<string, Job> = {
  "0 6 * * *": { path: "/api/cron/nursing-recurring", method: "GET" },
  "0 8 * * *": { path: "/api/cron/appointment-reminders", method: "GET" },
  "0 9 * * *": { path: "/api/notifications/process", method: "POST" },
};

async function runJob(job: Job, env: Env): Promise<Response> {
  const url = `${env.APP_URL.replace(/\/$/, "")}${job.path}`;
  return fetch(url, {
    method: job.method,
    headers: {
      Authorization: `Bearer ${env.CRON_SECRET}`,
      "User-Agent": "spirmedical-cron/1.0",
    },
  });
}

export default {
  // يُستدعى تلقائياً من Cron Triggers
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const job = JOBS[controller.cron];
    if (!job) {
      console.warn(`No job mapped for cron: ${controller.cron}`);
      return;
    }
    ctx.waitUntil(
      runJob(job, env)
        .then(async (res) =>
          console.log(`cron ${controller.cron} → ${job.path} [${res.status}]`)
        )
        .catch((err) => console.error(`cron ${controller.cron} failed:`, err))
    );
  },

  // تشغيل يدوي للاختبار: GET https://<worker>/?job=0%206%20*%20*%20*
  async fetch(req: Request, env: Env): Promise<Response> {
    const { searchParams } = new URL(req.url);
    const cron = searchParams.get("job");
    if (cron && JOBS[cron]) {
      const res = await runJob(JOBS[cron], env);
      const body = await res.text();
      return new Response(
        `Triggered ${JOBS[cron].path} → ${res.status}\n${body}`,
        { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }
    return new Response(
      "spirmedical-cron worker — OK\n\nاستخدم ?job=<cron-expression> للتشغيل اليدوي.\nالجداول النشطة:\n" +
        Object.keys(JOBS)
          .map((c) => `  ${c}  →  ${JOBS[c].method} ${JOBS[c].path}`)
          .join("\n"),
      { headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  },
};
