/**
 * Docker/NAS helper: call the sync HTTP endpoint on a timer.
 * Run beside `next start` (see Dockerfile CMD / docker-compose).
 *
 * Example:
 *   node scripts/http-sync-scheduler.mjs
 */
const HOURS = (process.env.SYNC_SCHEDULER_HOURS || "9,13")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isInteger(n) && n >= 0 && n <= 23);

const TZ = process.env.SYNC_SCHEDULER_TZ || "America/Toronto";
const BASE =
  process.env.SYNC_SCHEDULER_BASE_URL?.replace(/\/$/, "") ||
  `http://127.0.0.1:${process.env.PORT || 3000}`;
const SECRET =
  process.env.SYNC_API_SECRET?.trim() || process.env.CRON_SECRET?.trim() || "";

function zonedParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i++) {
    const local = zonedParts(new Date(utc), timeZone);
    const asLocalMs = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    const wantedMs = Date.UTC(year, month - 1, day, hour, minute, 0);
    utc += wantedMs - asLocalMs;
  }
  return new Date(utc);
}

function addLocalDays(year, month, day, days) {
  const dt = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  };
}

function nextRun(from = new Date()) {
  const local = zonedParts(from, TZ);
  const hours = HOURS.length ? HOURS : [9, 13];
  const candidates = [];
  for (const dayOffset of [0, 1, 2]) {
    const d = addLocalDays(local.year, local.month, local.day, dayOffset);
    for (const hour of hours) {
      candidates.push(zonedTimeToUtc(d.year, d.month, d.day, hour, 0, TZ));
    }
  }
  return candidates
    .filter((d) => d.getTime() > from.getTime() + 1500)
    .sort((a, b) => a.getTime() - b.getTime())[0];
}

async function runSync() {
  const headers = { Accept: "application/json" };
  if (SECRET) headers.Authorization = `Bearer ${SECRET}`;
  const res = await fetch(`${BASE}/api/v1/sync/offerings`, {
    method: "POST",
    headers,
  });
  const body = await res.json().catch(() => ({}));
  console.info(
    `[http-sync-scheduler] ${res.status}`,
    body.updated != null
      ? `updated=${body.updated} inserted=${body.inserted}`
      : body.error || "",
  );
}

function arm() {
  const next = nextRun();
  const delay = Math.max(1000, next.getTime() - Date.now());
  console.info(`[http-sync-scheduler] next ${next.toISOString()} (${TZ}) → ${BASE}`);
  setTimeout(() => {
    runSync()
      .catch((err) => console.error("[http-sync-scheduler]", err))
      .finally(arm);
  }, delay);
}

arm();
