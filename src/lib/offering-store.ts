import type { ProductOffering } from "@/lib/product-offering";
import { getProductLogDb } from "@/lib/db";
import { diffObjects, type FieldChange } from "@/lib/offering-diff";

export type AuditActionType = "INSERT" | "UPDATE";

export interface AuditLogRow {
  id: number;
  product_offering_id: string;
  action_type: AuditActionType;
  changed_at: string;
  detected_changes: string;
  full_snapshot: string;
}

export interface AuditLogEntry {
  id: number;
  productOfferingId: string;
  actionType: AuditActionType;
  changedAt: string;
  detectedChanges: FieldChange[];
  fullSnapshot: unknown;
}

export interface SyncOfferingResult {
  id: string;
  action: "unchanged" | "INSERT" | "UPDATE";
  changes: FieldChange[];
  auditLogId?: number;
}

type OfferingRow = {
  id: string;
  name: string;
  description: string | null;
  version: string | null;
  href: string | null;
  lifecycle_status: string | null;
  start_date_time: string | null;
  end_date_time: string | null;
  last_update: string | null;
  retirement_date_time: string | null;
  is_bundle: number | null;
  is_customer_visible: number | null;
  scope: string | null;
  type_annotation: string | null;
  base_type_annotation: string | null;
  category_ref: string | null;
  product_specification_ref: string | null;
  bundled_product_offering_ref: string | null;
  product_offering_price_ref: string | null;
  prod_spec_char_value_use: string | null;
  metadata: string | null;
  change_log: string | null;
};

function parseJsonColumn<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Rebuild a ProductOffering-shaped object from a flattened SQLite row. */
export function rowToOffering(row: OfferingRow): ProductOffering {
  const offering: ProductOffering = {
    id: row.id,
    name: row.name,
  };

  if (row.description != null) offering.description = row.description;
  if (row.version != null) offering.version = row.version;
  if (row.href != null) offering.href = row.href;
  if (row.lifecycle_status != null) offering.lifecycleStatus = row.lifecycle_status;
  if (row.start_date_time != null) offering.startDateTime = row.start_date_time;
  if (row.end_date_time != null) offering.endDateTime = row.end_date_time;
  if (row.last_update != null) offering.lastUpdate = row.last_update;
  if (row.retirement_date_time != null) offering.retirementDateTime = row.retirement_date_time;
  if (row.is_bundle != null) offering.isBundle = Boolean(row.is_bundle);
  if (row.is_customer_visible != null) offering.isCustomerVisible = Boolean(row.is_customer_visible);
  if (row.scope != null) offering.scope = row.scope;
  if (row.type_annotation != null) offering["@type"] = row.type_annotation;
  if (row.base_type_annotation != null) offering["@baseType"] = row.base_type_annotation;

  offering.categoryRef = parseJsonColumn(row.category_ref, undefined);
  offering.productSpecificationRef = parseJsonColumn(row.product_specification_ref, undefined);
  offering.bundledProductOfferingRef = parseJsonColumn(row.bundled_product_offering_ref, undefined);
  offering.productOfferingPriceRef = parseJsonColumn(row.product_offering_price_ref, undefined);
  offering.prodSpecCharValueUse = parseJsonColumn(row.prod_spec_char_value_use, undefined);
  offering.metadata = parseJsonColumn(row.metadata, undefined);
  offering.changeLog = parseJsonColumn(row.change_log, undefined);

  return offering;
}

/** Flatten a ProductOffering into SQLite column values. */
export function offeringToRow(offering: ProductOffering): OfferingRow {
  return {
    id: offering.id,
    name: offering.name,
    description: offering.description ?? null,
    version: offering.version ?? null,
    href: offering.href ?? null,
    lifecycle_status: offering.lifecycleStatus ?? null,
    start_date_time: offering.startDateTime ?? null,
    end_date_time: offering.endDateTime ?? null,
    last_update: offering.lastUpdate ?? null,
    retirement_date_time: offering.retirementDateTime ?? null,
    is_bundle: offering.isBundle ? 1 : 0,
    is_customer_visible: offering.isCustomerVisible === false ? 0 : 1,
    scope: offering.scope ?? null,
    type_annotation: offering["@type"] ?? null,
    base_type_annotation: offering["@baseType"] ?? null,
    category_ref: offering.categoryRef != null ? JSON.stringify(offering.categoryRef) : null,
    product_specification_ref:
      offering.productSpecificationRef != null
        ? JSON.stringify(offering.productSpecificationRef)
        : null,
    bundled_product_offering_ref:
      offering.bundledProductOfferingRef != null
        ? JSON.stringify(offering.bundledProductOfferingRef)
        : null,
    product_offering_price_ref:
      offering.productOfferingPriceRef != null
        ? JSON.stringify(offering.productOfferingPriceRef)
        : null,
    prod_spec_char_value_use:
      offering.prodSpecCharValueUse != null
        ? JSON.stringify(offering.prodSpecCharValueUse)
        : null,
    metadata: offering.metadata != null ? JSON.stringify(offering.metadata) : null,
    change_log: offering.changeLog != null ? JSON.stringify(offering.changeLog) : null,
  };
}

function getOfferingRow(id: string): OfferingRow | null {
  const db = getProductLogDb();
  const row = db
    .prepare("SELECT * FROM product_offerings WHERE id = ? COLLATE NOCASE")
    .get(id) as unknown as OfferingRow | undefined;
  return row ?? null;
}

function upsertOfferingRow(row: OfferingRow): void {
  const db = getProductLogDb();
  db.prepare(
    `INSERT INTO product_offerings (
      id, name, description, version, href, lifecycle_status,
      start_date_time, end_date_time, last_update, retirement_date_time,
      is_bundle, is_customer_visible, scope, type_annotation, base_type_annotation,
      category_ref, product_specification_ref, bundled_product_offering_ref,
      product_offering_price_ref, prod_spec_char_value_use, metadata, change_log
    ) VALUES (
      @id, @name, @description, @version, @href, @lifecycle_status,
      @start_date_time, @end_date_time, @last_update, @retirement_date_time,
      @is_bundle, @is_customer_visible, @scope, @type_annotation, @base_type_annotation,
      @category_ref, @product_specification_ref, @bundled_product_offering_ref,
      @product_offering_price_ref, @prod_spec_char_value_use, @metadata, @change_log
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      version = excluded.version,
      href = excluded.href,
      lifecycle_status = excluded.lifecycle_status,
      start_date_time = excluded.start_date_time,
      end_date_time = excluded.end_date_time,
      last_update = excluded.last_update,
      retirement_date_time = excluded.retirement_date_time,
      is_bundle = excluded.is_bundle,
      is_customer_visible = excluded.is_customer_visible,
      scope = excluded.scope,
      type_annotation = excluded.type_annotation,
      base_type_annotation = excluded.base_type_annotation,
      category_ref = excluded.category_ref,
      product_specification_ref = excluded.product_specification_ref,
      bundled_product_offering_ref = excluded.bundled_product_offering_ref,
      product_offering_price_ref = excluded.product_offering_price_ref,
      prod_spec_char_value_use = excluded.prod_spec_char_value_use,
      metadata = excluded.metadata,
      change_log = excluded.change_log`,
  ).run(row);
}

function insertAuditLog(input: {
  productOfferingId: string;
  actionType: AuditActionType;
  changes: FieldChange[];
  snapshot: ProductOffering;
}): number {
  const db = getProductLogDb();
  const result = db
    .prepare(
      `INSERT INTO audit_logs (
        product_offering_id, action_type, detected_changes, full_snapshot
      ) VALUES (?, ?, ?, ?)`,
    )
    .run(
      input.productOfferingId,
      input.actionType,
      JSON.stringify(input.changes),
      JSON.stringify(input.snapshot),
    );

  return Number(result.lastInsertRowid);
}

function mapAuditRow(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    productOfferingId: row.product_offering_id,
    actionType: row.action_type,
    changedAt: row.changed_at,
    detectedChanges: parseJsonColumn<FieldChange[]>(row.detected_changes, []),
    fullSnapshot: parseJsonColumn(row.full_snapshot, null),
  };
}

export function getAuditLogsForOffering(productOfferingId: string): AuditLogEntry[] {
  const db = getProductLogDb();
  const rows = db
    .prepare(
      `SELECT id, product_offering_id, action_type, changed_at, detected_changes, full_snapshot
       FROM audit_logs
       WHERE product_offering_id = ? COLLATE NOCASE
       ORDER BY datetime(changed_at) DESC, id DESC`,
    )
    .all(productOfferingId) as unknown as AuditLogRow[];

  return rows.map(mapAuditRow);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Compare incoming offering JSON to the last stored SQLite row.
 * Identical → no-op. Different → audit_logs insert + product_offerings upsert.
 */
export function syncProductOffering(offering: ProductOffering): SyncOfferingResult {
  if (!offering?.id) {
    throw new Error("Product offering id is required for sync");
  }

  const snapshot = cloneJson(offering);
  const existing = getOfferingRow(offering.id);
  const nextRow = offeringToRow(snapshot);

  if (!existing) {
    upsertOfferingRow(nextRow);
    const changes: FieldChange[] = [{ path: "(root)", from: null, to: "created" }];
    const auditLogId = insertAuditLog({
      productOfferingId: snapshot.id,
      actionType: "INSERT",
      changes,
      snapshot,
    });
    return { id: snapshot.id, action: "INSERT", changes, auditLogId };
  }

  const previous = cloneJson(rowToOffering(existing));
  const changes = diffObjects(previous, snapshot);

  if (changes.length === 0) {
    return { id: snapshot.id, action: "unchanged", changes: [] };
  }

  upsertOfferingRow(nextRow);
  const auditLogId = insertAuditLog({
    productOfferingId: snapshot.id,
    actionType: "UPDATE",
    changes,
    snapshot,
  });

  return { id: snapshot.id, action: "UPDATE", changes, auditLogId };
}

export function syncProductOfferings(offerings: ProductOffering[]): {
  total: number;
  inserted: number;
  updated: number;
  unchanged: number;
  results: SyncOfferingResult[];
} {
  const results: SyncOfferingResult[] = [];
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  for (const offering of offerings) {
    const result = syncProductOffering(offering);
    results.push(result);
    if (result.action === "INSERT") inserted += 1;
    else if (result.action === "UPDATE") updated += 1;
    else unchanged += 1;
  }

  return { total: offerings.length, inserted, updated, unchanged, results };
}
