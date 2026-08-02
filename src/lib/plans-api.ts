/**
 * ============================================================================
 * PLANS API — edit this file when you get the real API
 * ============================================================================
 *
 * Today: fake API that returns CCP catalogue mock data
 * Later:
 *   1. Set PLANS_API_BASE_URL + auth (token and/or username/password) in .env.local
 *   2. Cron hits POST /api/v1/sync/offerings → fetches external JSON → compares/inserts SQLite
 *   3. Compare / audit_logs / Change log (Unlisted) UI stay the same
 *
 * Used by:
 *   src/app/api/v1/plans/route.ts
 *   src/app/api/v1/plans/[id]/route.ts
 *   src/app/api/v1/sync/offerings/route.ts
 */

import { summariesFromCategory } from "@/lib/catalog";
import { MOCK_PLANS } from "@/lib/mock-data";
import {
  getProductOfferingById,
  planFromProductOffering,
  type ProductOffering,
} from "@/lib/product-offering";
import {
  getAuditLogsForOffering,
  syncProductOffering,
  syncProductOfferings,
} from "@/lib/offering-store";
import {
  buildAmendmentAlert,
  getPendingAmendmentAlertForId,
  getPendingAmendmentAlerts,
  getPlanChangeBadgesFromAudits,
  hydratePendingAlertsFromUnaackedAudits,
  markAmendmentAlertsShown,
  takePendingAmendmentAlertsForCleanFetch,
  upsertPendingAmendmentAlerts,
} from "@/lib/amendment-alerts";
import { classifyTelusChanges, formatTelusChangeLabel } from "@/lib/telus-change";
import { inspectOfferingSchema } from "@/lib/offering-schema";
import type { Plan, PlanByIdResponse, PlanListResponse, PlanSummary } from "@/lib/types";
import offeringsById from "@/data/product-offerings.json";

// ---------------------------------------------------------------------------
// 1. Config — put your real API base URL + credentials in .env.local
// ---------------------------------------------------------------------------

/** Example: https://api.telecom.internal/api/v1 */
export const PLANS_API_BASE_URL =
  process.env.PLANS_API_BASE_URL?.replace(/\/$/, "") || "";

/** Flip to true once PLANS_API_BASE_URL is set and the real fetch works. */
export const USE_REAL_API = Boolean(PLANS_API_BASE_URL);

/** Shared headers for the external catalogue API (Bearer and/or Basic). */
export function upstreamApiHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token = process.env.PLANS_API_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const username = process.env.PLANS_API_USERNAME?.trim();
  const password = process.env.PLANS_API_PASSWORD ?? "";
  if (username && !token) {
    const basic = Buffer.from(`${username}:${password}`, "utf8").toString("base64");
    headers.Authorization = `Basic ${basic}`;
  }

  return headers;
}

async function fetchUpstream(path: string): Promise<Response> {
  return fetch(`${PLANS_API_BASE_URL}${path}`, {
    method: "GET",
    headers: upstreamApiHeaders(),
    cache: "no-store",
  });
}

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

function extractOfferingIds(data: unknown): string[] {
  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (item && typeof item === "object" && "id" in item) {
          return String((item as { id: unknown }).id);
        }
        return "";
      })
      .filter(Boolean);
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.productOfferingRef)) {
      return obj.productOfferingRef
        .map((ref) => {
          if (ref && typeof ref === "object" && "id" in ref) {
            return String((ref as { id: unknown }).id);
          }
          return "";
        })
        .filter(Boolean);
    }
    if (Array.isArray(obj.plans)) {
      return obj.plans
        .map((p) => {
          if (p && typeof p === "object" && "id" in p) {
            return String((p as { id: unknown }).id);
          }
          return "";
        })
        .filter(Boolean);
    }
  }

  return [];
}

/**
 * Pull current ProductOffering JSON from the external API (authenticated).
 * Used by the 8am/1pm sync job before compare + SQLite insert.
 */
export async function fetchUpstreamOfferings(): Promise<ProductOffering[]> {
  if (!USE_REAL_API) {
    throw new Error("PLANS_API_BASE_URL is not set");
  }

  const listRes = await fetchUpstream("/plans");
  if (!listRes.ok) {
    throw new Error(`Upstream list failed (${listRes.status})`);
  }

  const listData: unknown = await listRes.json();
  const ids = extractOfferingIds(listData);
  const offerings: ProductOffering[] = [];

  for (const id of ids) {
    const detail = await fetchUpstream(`/plans/${encodeURIComponent(id)}`);
    if (!detail.ok) continue;
    const body: unknown = await detail.json();
    if (body && typeof body === "object" && "id" in body) {
      offerings.push(body as ProductOffering);
    }
  }

  return offerings;
}

// ---------------------------------------------------------------------------
// 2. GET /plans — list plan IDs + names
// ---------------------------------------------------------------------------

export async function getPlanList(): Promise<PlanListResponse> {
  const endpoint = "/api/v1/plans";

  // ── REAL API (enable when you have it) ───────────────────────────────────
  if (USE_REAL_API) {
    const res = await fetchUpstream("/plans");

    if (!res.ok) {
      return {
        status: res.status,
        endpoint,
        count: 0,
        plans: [],
        amendedPlans: [],
        flaggedPlans: [],
      };
    }

    const data: unknown = await res.json();
    const plans = parsePlanListPayload(data);
    const { amendedPlans, flaggedPlans } = await collectAmendmentUi(plans);
    return { status: 200, endpoint, count: plans.length, plans, amendedPlans, flaggedPlans };
  }

  // ── FAKE API (delete this block once real API is live) ───────────────────
  await delay(300);
  const plans = MOCK_PLANS.map(toSummary);
  const { amendedPlans, flaggedPlans } = await collectAmendmentUi(plans);
  return {
    status: 200,
    endpoint,
    count: plans.length,
    plans,
    amendedPlans,
    flaggedPlans,
  };
}

/**
 * Sync offerings, then split UI signals:
 * - amendedPlans → top warning banner (clears on clean fetch)
 * - flaggedPlans → under-ID badges (persist via audit_logs)
 */
async function collectAmendmentUi(plans: PlanSummary[]): Promise<{
  amendedPlans: NonNullable<PlanListResponse["amendedPlans"]>;
  flaggedPlans: NonNullable<PlanListResponse["flaggedPlans"]>;
}> {
  const nameById = new Map(plans.map((p) => [p.id.trim().toLowerCase(), p.name]));
  let amendedPlans: NonNullable<PlanListResponse["amendedPlans"]> = [];
  let flaggedFromSync: NonNullable<PlanListResponse["flaggedPlans"]> = [];

  try {
    const offerings = USE_REAL_API
      ? await fetchUpstreamOfferings()
      : Object.values(offeringsById as Record<string, ProductOffering>);

    const byId = new Map(offerings.map((o) => [o.id.trim().toLowerCase(), o]));
    const toSync: ProductOffering[] = [];
    for (const plan of plans) {
      const offering = byId.get(plan.id.trim().toLowerCase());
      if (offering) toSync.push(offering);
    }

    try {
      hydratePendingAlertsFromUnaackedAudits(nameById);
    } catch (error) {
      console.error("[collectAmendmentUi] hydrate", error);
    }

    if (toSync.length > 0) {
      const summary = syncProductOfferings(toSync);
      const justChanged = summary.results.filter((r) => r.action !== "unchanged");

      flaggedFromSync = justChanged
        .map((r) =>
          buildAmendmentAlert(
            r.id,
            nameById.get(r.id.trim().toLowerCase()) ?? r.id,
            r.changes,
            r.action,
          ),
        )
        .filter((a): a is NonNullable<typeof a> => Boolean(a));

      if (justChanged.length > 0) {
        try {
          upsertPendingAmendmentAlerts(flaggedFromSync);
          markAmendmentAlertsShown();
          amendedPlans = getPendingAmendmentAlerts();
        } catch (error) {
          console.error("[collectAmendmentUi] pending upsert", error);
          amendedPlans = flaggedFromSync;
        }
      } else {
        try {
          amendedPlans = takePendingAmendmentAlertsForCleanFetch();
        } catch (error) {
          console.error("[collectAmendmentUi] pending take", error);
          amendedPlans = [];
        }
      }
    } else {
      try {
        amendedPlans = takePendingAmendmentAlertsForCleanFetch();
      } catch (error) {
        console.error("[collectAmendmentUi] pending take", error);
        amendedPlans = [];
      }
    }
  } catch (error) {
    console.error("[collectAmendmentUi] sync", error);
  }

  // Badges: prefer durable audit_logs; fall back to this request's sync hits
  let flaggedPlans: NonNullable<PlanListResponse["flaggedPlans"]> = [];
  try {
    flaggedPlans = getPlanChangeBadgesFromAudits(nameById);
  } catch (error) {
    console.error("[collectAmendmentUi] badges", error);
  }

  if (flaggedPlans.length === 0 && flaggedFromSync.length > 0) {
    flaggedPlans = flaggedFromSync;
  }

  // Merge any pending banner rows into badges so under-ID labels never lag the banner
  if (amendedPlans.length > 0) {
    const byId = new Map(flaggedPlans.map((p) => [p.id.trim().toLowerCase(), p]));
    for (const row of amendedPlans) {
      byId.set(row.id.trim().toLowerCase(), row);
    }
    flaggedPlans = [...byId.values()];
  }

  return { amendedPlans, flaggedPlans };
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
    const res = await fetchUpstream(`/plans/${encodeURIComponent(trimmed)}`);

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
    return withAuditSync(endpoint, plan, offering as ProductOffering | undefined, data);
  }

  // ── FAKE API (delete this block once real API is live) ───────────────────
  await delay(300);
  const offering = getProductOfferingById(trimmed);
  if (!offering) {
    return { status: 404, endpoint, plan: null, error: `Plan not found: ${trimmed}` };
  }

  return withAuditSync(endpoint, planFromProductOffering(offering), offering, offering);
}

/** Compare fetched offering vs last SQLite snapshot; attach unlisted audit logs. */
function withAuditSync(
  endpoint: string,
  plan: Plan,
  offering: ProductOffering | undefined,
  rawPayload?: unknown,
): PlanByIdResponse {
  if (!offering) {
    return { status: 200, endpoint, plan, offering };
  }

  const schemaNotes = inspectOfferingSchema(rawPayload ?? offering);

  try {
    const sync = syncProductOffering(offering);
    const flags = classifyTelusChanges(sync.changes);
    if (sync.action === "INSERT" && !flags.listed && !flags.unlisted) {
      flags.unlisted = true;
    }

    if (sync.action !== "unchanged") {
      const alert = buildAmendmentAlert(offering.id, plan.name, sync.changes, sync.action);
      if (alert) upsertPendingAmendmentAlerts([alert]);
    }

    const pending = getPendingAmendmentAlertForId(offering.id);
    const auditLogs = getAuditLogsForOffering(offering.id);
    const telusChangeLabel =
      (sync.action === "unchanged" ? null : formatTelusChangeLabel(flags)) ??
      pending?.label ??
      null;

    return {
      status: 200,
      endpoint,
      plan,
      offering,
      auditLogs,
      schemaNotes,
      sync: {
        action: sync.action,
        changeCount: sync.changes.length,
        listed: flags.listed || Boolean(pending?.listed),
        unlisted: flags.unlisted || Boolean(pending?.unlisted),
        telusChangeLabel,
      },
    };
  } catch (error) {
    console.error("[withAuditSync]", error);
    return { status: 200, endpoint, plan, offering, auditLogs: [], schemaNotes };
  }
}
