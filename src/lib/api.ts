/**
 * Browser-side helpers — UI calls these, which hit the Next.js API routes.
 * Do not put the upstream/real API URL here; that lives in src/lib/plans-api.ts
 */

import type { PlanByIdResponse, PlanListResponse } from "@/lib/types";

export interface SyncOfferingsResponse {
  status: number;
  endpoint: string;
  triggeredBy?: "cron" | "manual";
  ranAt?: string;
  source?: string;
  inserted?: number;
  updated?: number;
  unchanged?: number;
  total?: number;
  error?: string;
  changedIds?: Array<{ id: string; action: string; changeCount: number }>;
}

export async function fetchPlanList(options?: {
  acknowledgeAmendments?: boolean;
}): Promise<PlanListResponse> {
  const params = options?.acknowledgeAmendments ? "?ackAmendments=1" : "";
  const res = await fetch(`/api/v1/plans${params}`, { cache: "no-store" });
  const data = (await res.json()) as PlanListResponse;
  return { ...data, status: data.status ?? res.status };
}

/** Instant catalogue sync (same endpoint the 9am / 1pm cron hits). */
export async function syncOfferingsNow(): Promise<SyncOfferingsResponse> {
  const res = await fetch("/api/v1/sync/offerings", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  const data = (await res.json()) as SyncOfferingsResponse;
  return { ...data, status: data.status ?? res.status };
}

export async function fetchPlanById(id: string): Promise<PlanByIdResponse> {
  const trimmed = id.trim();
  if (!trimmed) {
    return {
      status: 400,
      endpoint: "/api/v1/plans/:id",
      plan: null,
      error: "Plan ID is required",
    };
  }

  const res = await fetch(`/api/v1/plans/${encodeURIComponent(trimmed)}`, {
    cache: "no-store",
  });
  const data = (await res.json()) as PlanByIdResponse;
  return { ...data, status: data.status ?? res.status };
}
