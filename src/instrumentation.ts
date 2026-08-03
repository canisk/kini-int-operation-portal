/**
 * Intentionally empty of Node-only imports.
 * Scheduling is triggered via HTTP (/api/v1/sync/offerings):
 * - Vercel Cron (vercel.json)
 * - Manual Refresh on All Plans
 * - Docker/NAS: optional side process / system cron hitting the same URL
 *
 * Do NOT import sync-scheduler / db / fs here — it breaks the Next.js
 * instrumentation compile (Can't resolve 'fs') and takes down the app.
 */
export async function register() {
  // no-op
}
