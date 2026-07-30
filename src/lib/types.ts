export type AppTab = "dashboard" | "all-plans";

export interface PlanSummary {
  id: string;
  name: string;
  category: string;
}

export interface PlanRef {
  id: string;
  name: string;
}

export interface PlanChangeLogEntry {
  changeDate: string;
  changeDescription: string;
  version: string;
  changeType: string;
}

export interface PlanRelationships {
  promos: string[];
  parents: string[][];
  bundles: string[];
}

/** Normalized plan used by the UI (from category list or ProductOffering by id). */
export interface Plan {
  id: string;
  name: string;
  category: string;
  price: number;
  /** GB allowance; `null` = unlimited, `undefined` = not specified */
  data_gb: number | null | undefined;
  calls: string;
  sms: string | null;
  /** Name-derived tags (e.g. Region, MMS) — empty when none found */
  features: string[];
  status: string;
  /** Present when loaded from full ProductOffering by-id JSON */
  description?: string;
  version?: string;
  places?: string[];
  user_tags?: string[];
  bundled_offerings?: PlanRef[];
  price_refs?: PlanRef[];
  start_date?: string;
  end_date?: string;
  last_update?: string;
  retirement_date?: string;
  is_bundle?: boolean;
  is_customer_visible?: boolean;
  category_type?: string;
  change_log?: PlanChangeLogEntry[];
  relationships?: PlanRelationships;
}

/** API 1 — GET /api/v1/plans */
export interface PlanListResponse {
  status: number;
  endpoint: string;
  count: number;
  plans: PlanSummary[];
}

/** API 2 — GET /api/v1/plans/:id */
export interface PlanByIdResponse {
  status: number;
  endpoint: string;
  plan: Plan | null;
  error?: string;
  /** Raw CCP ProductOffering when available (for JSON view). */
  offering?: unknown;
}
