/**
 * Browser-side helpers — UI calls these, which hit the Next.js API routes.
 * Do not put the upstream/real API URL here; that lives in src/lib/plans-api.ts
 */

import type { PlanByIdResponse, PlanListResponse } from "@/lib/types";

export async function fetchPlanList(): Promise<PlanListResponse> {
  const res = await fetch("/api/v1/plans", { cache: "no-store" });
  const data = (await res.json()) as PlanListResponse;
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
