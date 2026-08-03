import { NextResponse } from "next/server";
import { runOfferingSync, type SyncTriggerSource } from "@/lib/offering-sync-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET/POST /api/v1/sync/offerings  — portable sync entrypoint
 *
 * Triggers (same job):
 * - Manual Refresh on /plans-portal/all-plans
 * - Vercel Cron (vercel.json) while on Vercel
 * - Optional external NAS/system cron → this URL
 * - Docker/NAS also has an in-process scheduler that calls runOfferingSync() directly
 */
export async function POST(request: Request) {
  return handleSync(request);
}

export async function GET(request: Request) {
  return handleSync(request);
}

async function handleSync(request: Request) {
  const authError = authorizeSyncRequest(request);
  if (authError) return authError;

  const triggeredBy = resolveTriggerSource(request);

  try {
    const body = await runOfferingSync(triggeredBy);
    return NextResponse.json(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    console.error("[sync/offerings]", error);
    return NextResponse.json(
      {
        status: 500,
        endpoint: "/api/v1/sync/offerings",
        triggeredBy,
        error: message,
      },
      { status: 500 },
    );
  }
}

/**
 * Optional SYNC_API_SECRET / CRON_SECRET:
 * - No Authorization header → allow (portal Refresh)
 * - Bearer matching secret → allow (Vercel Cron / external cron)
 * - Wrong Bearer → 401
 */
function authorizeSyncRequest(request: Request): NextResponse | null {
  const secret =
    process.env.SYNC_API_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  if (!secret) return null;

  const auth = request.headers.get("authorization");
  if (!auth) return null;
  if (auth === `Bearer ${secret}`) return null;

  return NextResponse.json(
    { status: 401, endpoint: "/api/v1/sync/offerings", error: "Unauthorized" },
    { status: 401 },
  );
}

function resolveTriggerSource(request: Request): SyncTriggerSource {
  if (request.headers.get("x-vercel-cron") === "1") return "cron";

  const secret =
    process.env.SYNC_API_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return "cron";
  return "manual";
}
