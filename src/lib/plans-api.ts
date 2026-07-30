/**
 * ============================================================================
 * PLANS API — edit this file when you get the real API
 * ============================================================================
 *
 * Today: fake API that returns CCP catalogue mock data
 * Later: set PLANS_API_BASE_URL and adjust parsing if needed
 *
 * Used by:
 *   src/app/api/v1/plans/route.ts
 *   src/app/api/v1/plans/[id]/route.ts
 */

import { summariesFromCategory } from "@/lib/catalog";
import { MOCK_PLANS } from "@/lib/mock-data";
import {
  getProductOfferingById,
  planFromProductOffering,
  type ProductOffering,
} from "@/lib/product-offering";
import type { Plan, PlanByIdResponse, PlanListResponse, PlanSummary } from "@/lib/types";

// ---------------------------------------------------------------------------
// 1. Config — put your real API base URL here (or in .env.local)
// ---------------------------------------------------------------------------

/** Example: https://api.telecom.internal/api/v1 */
export const PLANS_API_BASE_URL =
  process.env.PLANS_API_BASE_URL?.replace(/\/$/, "") || "";

/** Flip to true once PLANS_API_BASE_URL is set and the real fetch works. */
const USE_REAL_API = Boolean(PLANS_API_BASE_URL);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSummary(plan: Pick<Plan, "id" | "name" | "category">): PlanSummary {
  return { id: plan.id, name: plan.name, category: plan.category };
}

/** Normalize CCP Category or `{ plans: [...] }` list responses. */
function parsePlanListPayload(data: unknown): PlanSummary[] {
  if (Array.isArray(data)) {
    return data.map((item) => {
      const p = item as Partial<Plan>;
      return toSummary({
        id: String(p.id ?? ""),
        name: String(p.name ?? ""),
        category: String(p.category ?? "prepaid"),
      });
    });
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    // CCP Product Catalog Category: { productOfferingRef: [{ id, name }], metadata… }
    if (Array.isArray(obj.productOfferingRef)) {
      return summariesFromCategory(obj as unknown as Parameters<typeof summariesFromCategory>[0]);
    }

    if (Array.isArray(obj.plans)) {
      return (obj.plans as Partial<Plan>[]).map((p) =>
        toSummary({
          id: String(p.id ?? ""),
          name: String(p.name ?? ""),
          category: String(p.category ?? "prepaid"),
        }),
      );
    }
  }

  return [];
}

function parsePlanByIdPayload(data: unknown): { plan: Plan | null; offering?: unknown } {
  if (!data || typeof data !== "object") {
    return { plan: null };
  }

  const obj = data as Record<string, unknown>;

  if (obj["@type"] === "ProductOffering" || obj.prodSpecCharValueUse || obj.bundledProductOfferingRef) {
    const offering = data as ProductOffering;
    return { plan: planFromProductOffering(offering), offering };
  }

  if (obj.plan) {
    return { plan: obj.plan as Plan };
  }

  if (obj.id && obj.name) {
    return { plan: obj as unknown as Plan };
  }

  return { plan: null };
}

// ---------------------------------------------------------------------------
// 2. GET /plans — list plan IDs + names
// ---------------------------------------------------------------------------

export async function getPlanList(): Promise<PlanListResponse> {
  const endpoint = "/api/v1/plans";

  // ── REAL API (enable when you have it) ───────────────────────────────────
  if (USE_REAL_API) {
    const res = await fetch(`${PLANS_API_BASE_URL}/plans`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        // Authorization: `Bearer ${process.env.PLANS_API_TOKEN}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { status: res.status, endpoint, count: 0, plans: [] };
    }

    const data: unknown = await res.json();
    const plans = parsePlanListPayload(data);
    return { status: 200, endpoint, count: plans.length, plans };
  }

  // ── FAKE API (delete this block once real API is live) ───────────────────
  await delay(300);
  const plans = MOCK_PLANS.map(toSummary);
  return {
    status: 200,
    endpoint,
    count: plans.length,
    plans,
  };
}

// ---------------------------------------------------------------------------
// 3. GET /plans/:id — full plan details (CCP ProductOffering shape)
// ---------------------------------------------------------------------------

export async function getPlanById(id: string): Promise<PlanByIdResponse> {
  const trimmed = id.trim();
  const endpoint = `/api/v1/plans/${encodeURIComponent(trimmed || ":id")}`;

  if (!trimmed) {
    return { status: 400, endpoint, plan: null, error: "Plan ID is required" };
  }

  // ── REAL API (enable when you have it) ───────────────────────────────────
  if (USE_REAL_API) {
    const res = await fetch(`${PLANS_API_BASE_URL}/plans/${encodeURIComponent(trimmed)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        // Authorization: `Bearer ${process.env.PLANS_API_TOKEN}`,
      },
      cache: "no-store",
    });

    if (res.status === 404) {
      return { status: 404, endpoint, plan: null, error: `Plan not found: ${trimmed}` };
    }

    if (!res.ok) {
      return {
        status: res.status,
        endpoint,
        plan: null,
        error: `Upstream error (${res.status})`,
      };
    }

    const data: unknown = await res.json();
    const { plan, offering } = parsePlanByIdPayload(data);
    if (!plan) {
      return { status: 500, endpoint, plan: null, error: "Unexpected product offering shape" };
    }
    return { status: 200, endpoint, plan, offering };
  }

  // ── FAKE API (delete this block once real API is live) ───────────────────
  await delay(300);
  const offering = getProductOfferingById(trimmed);
  if (!offering) {
    return { status: 404, endpoint, plan: null, error: `Plan not found: ${trimmed}` };
  }

  return {
    status: 200,
    endpoint,
    plan: planFromProductOffering(offering),
    offering,
  };
}
