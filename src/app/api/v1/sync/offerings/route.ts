import { NextResponse } from "next/server";
import offeringsById from "@/data/product-offerings.json";
import {
  PLANS_API_BASE_URL,
  USE_REAL_API,
  fetchUpstreamOfferings,
} from "@/lib/plans-api";
import type { ProductOffering } from "@/lib/product-offering";
import { syncProductOfferings } from "@/lib/offering-store";
import { getProductLogDbPath } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/sync/offerings
 * Scheduled job (e.g. 8am & 1pm):
 *   external API (+ auth) → compare to SQLite → audit_logs + product_offerings
 */
export async function POST() {
  try {
    const offerings = await loadCurrentOfferings();
    const summary = syncProductOfferings(offerings);

    return NextResponse.json({
      status: 200,
      endpoint: "/api/v1/sync/offerings",
      dbPath: getProductLogDbPath(),
      source: USE_REAL_API ? "remote" : "local-json",
      apiBaseUrl: PLANS_API_BASE_URL || null,
      ...summary,
      changedIds: summary.results
        .filter((r) => r.action !== "unchanged")
        .map((r) => ({ id: r.id, action: r.action, changeCount: r.changes.length })),
      results: undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json(
      { status: 500, endpoint: "/api/v1/sync/offerings", error: message },
      { status: 500 },
    );
  }
}

/** Allow GET for easy browser/scheduler smoke tests. */
export async function GET() {
  return POST();
}

async function loadCurrentOfferings(): Promise<ProductOffering[]> {
  if (USE_REAL_API) {
    return fetchUpstreamOfferings();
  }
  // Dev fallback until real API credentials are configured
  return Object.values(offeringsById as Record<string, ProductOffering>);
}
