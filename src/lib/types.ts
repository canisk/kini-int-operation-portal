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

/** Unlisted change detected by comparing auto API pulls against SQLite. */
export interface AuditFieldChange {
  path: string;
  from: unknown;
  to: unknown;
}

export interface AuditLogEntry {
  id: number;
  productOfferingId: string;
  actionType: "INSERT" | "UPDATE";
  changedAt: string;
  detectedChanges: AuditFieldChange[];
  fullSnapshot: unknown;
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
  /** Warning banner only — clears on the next clean fetch. */
  amendedPlans?: Array<{
    id: string;
    name: string;
    listed: boolean;
    unlisted: boolean;
    label: string;
  }>;
  /** ISO timestamp for when the current banner batch was last written. */
  amendedAt?: string | null;
  /** ISO timestamp of the previous fetch/baseline before this amendment. */
  amendedFrom?: string | null;
  /** Persistent TELUS badges under plan IDs (from audit_logs; not cleared with the banner). */
  flaggedPlans?: Array<{
    id: string;
    name: string;
    listed: boolean;
    unlisted: boolean;
    label: string;
  }>;
}

/** API 2 — GET /api/v1/plans/:id */
export interface PlanByIdResponse {
  status: number;
  endpoint: string;
  plan: Plan | null;
  error?: string;
  /** Raw CCP ProductOffering when available (for JSON view). */
  offering?: unknown;
  /** SQLite audit_logs for this offering (unlisted change log). */
  auditLogs?: AuditLogEntry[];
  /** Result of compare/sync against the last stored auto request. */
  sync?: {
    action: "unchanged" | "INSERT" | "UPDATE";
    changeCount: number;
    listed: boolean;
    unlisted: boolean;
    /** e.g. "⚠️Listed / Unlisted change by TELUS" when this fetch detected amendments. */
    telusChangeLabel: string | null;
  };
  /**
   * Heads-up when raw API JSON keys don't match ProductOffering
   * (unknown renames / extras, or missing core fields).
   */
  schemaNotes?: {
    unknownProperties: string[];
    missingProperties: string[];
  };
}
