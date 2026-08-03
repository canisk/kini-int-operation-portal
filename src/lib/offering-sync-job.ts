import offeringsById from "@/data/product-offerings.json";
import {
  PLANS_API_BASE_URL,
  USE_REAL_API,
  fetchUpstreamOfferings,
} from "@/lib/plans-api";
import type { ProductOffering } from "@/lib/product-offering";
import { syncProductOfferings } from "@/lib/offering-store";
import {
  buildAmendmentAlert,
  getLastFetchAt,
  replacePendingAmendmentAlerts,
  touchLastFetchAt,
} from "@/lib/amendment-alerts";
import { getProductLogDbPath } from "@/lib/db";
import { notifySlackFromAlerts } from "@/lib/slack";

export type SyncTriggerSource = "scheduler" | "manual" | "cron";

export interface OfferingSyncResult {
  status: number;
  endpoint: string;
  triggeredBy: SyncTriggerSource;
  ranAt: string;
  dbPath: string;
  source: "remote" | "local-json";
  apiBaseUrl: string | null;
  total: number;
  inserted: number;
  updated: number;
  unchanged: number;
  changedIds: Array<{ id: string; action: string; changeCount: number }>;
  slackNotified?: boolean;
  error?: string;
}

async function loadCurrentOfferings(): Promise<ProductOffering[]> {
  if (USE_REAL_API) {
    return fetchUpstreamOfferings();
  }
  return Object.values(offeringsById as Record<string, ProductOffering>);
}

/**
 * Shared sync job used by:
 * - Docker/NAS HTTP scheduler (9am & 1pm)
 * - Vercel Cron
 * - POST/GET /api/v1/sync/offerings (manual Refresh)
 */
export async function runOfferingSync(
  triggeredBy: SyncTriggerSource = "manual",
): Promise<OfferingSyncResult> {
  const offerings = await loadCurrentOfferings();
  const summary = syncProductOfferings(offerings);

  const changedAlerts = summary.results
    .filter((r) => r.action !== "unchanged")
    .map((r) => {
      const offering = offerings.find((o) => o.id === r.id);
      return buildAmendmentAlert(r.id, offering?.name ?? r.id, r.changes, r.action);
    })
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const detectedAt = new Date().toISOString();
  const previousFetchAt = getLastFetchAt();

  if (changedAlerts.length > 0) {
    replacePendingAmendmentAlerts(changedAlerts, {
      fromAt: previousFetchAt,
      updatedAt: detectedAt,
    });

    const changeCounts = new Map<string, number>();
    const actions = new Map<string, string>();
    const changesById = new Map<string, typeof summary.results[number]["changes"]>();
    for (const r of summary.results) {
      if (r.action === "unchanged") continue;
      const key = r.id.trim().toLowerCase();
      changeCounts.set(key, r.changes.length);
      actions.set(key, r.action);
      changesById.set(key, r.changes);
    }

    await notifySlackFromAlerts(triggeredBy, changedAlerts, {
      source: USE_REAL_API ? "remote" : "local-json",
      changeCounts,
      actions,
      changesById,
    });
  }

  touchLastFetchAt(detectedAt);

  return {
    status: 200,
    endpoint: "/api/v1/sync/offerings",
    triggeredBy,
    ranAt: new Date().toISOString(),
    dbPath: getProductLogDbPath(),
    source: USE_REAL_API ? "remote" : "local-json",
    apiBaseUrl: PLANS_API_BASE_URL || null,
    total: summary.total,
    inserted: summary.inserted,
    updated: summary.updated,
    unchanged: summary.unchanged,
    changedIds: summary.results
      .filter((r) => r.action !== "unchanged")
      .map((r) => ({ id: r.id, action: r.action, changeCount: r.changes.length })),
    slackNotified: changedAlerts.length > 0 && Boolean(process.env.SLACK_WEBHOOK_URL?.trim()),
  };
}
