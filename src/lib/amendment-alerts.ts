import { getProductLogDb } from "@/lib/db";
import { sqliteUtcToIso } from "@/lib/datetime";
import { classifyTelusChanges, formatTelusChangeLabel } from "@/lib/telus-change";
import type { AuditFieldChange } from "@/lib/types";

export interface PendingAmendmentAlert {
  id: string;
  name: string;
  listed: boolean;
  unlisted: boolean;
  label: string;
}

type PendingRow = {
  product_offering_id: string;
  name: string;
  listed: number;
  unlisted: number;
  label: string;
};

/** Ensure pending-alert tables exist. */
export function ensureAmendmentAlertSchema(): void {
  const db = getProductLogDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_amendment_alerts (
      product_offering_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      listed INTEGER NOT NULL DEFAULT 0,
      unlisted INTEGER NOT NULL DEFAULT 1,
      label TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS amendment_alert_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function getMeta(key: string): string | null {
  ensureAmendmentAlertSchema();
  const row = getProductLogDb()
    .prepare("SELECT value FROM amendment_alert_meta WHERE key = ?")
    .get(key) as unknown as { value: string } | undefined;
  return row?.value ?? null;
}

function setMeta(key: string, value: string): void {
  ensureAmendmentAlertSchema();
  getProductLogDb()
    .prepare(
      `INSERT INTO amendment_alert_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, value);
}

function isBannerHidden(): boolean {
  return getMeta("banner_hidden") === "1";
}

function setBannerHidden(hidden: boolean): void {
  setMeta("banner_hidden", hidden ? "1" : "0");
}

export function getLastFetchAt(): string | null {
  const raw = getMeta("last_fetch_at")?.trim();
  return raw || null;
}

export function touchLastFetchAt(iso = new Date().toISOString()): void {
  setMeta("last_fetch_at", iso);
}

export function getPendingAmendmentAlerts(): PendingAmendmentAlert[] {
  ensureAmendmentAlertSchema();
  const rows = getProductLogDb()
    .prepare(
      `SELECT product_offering_id, name, listed, unlisted, label
       FROM pending_amendment_alerts
       ORDER BY datetime(updated_at) DESC, name ASC`,
    )
    .all() as unknown as PendingRow[];

  return rows.map((row) => ({
    id: row.product_offering_id,
    name: row.name,
    listed: Boolean(row.listed),
    unlisted: Boolean(row.unlisted),
    label: row.label,
  }));
}

/**
 * Banner should show only the latest change batch — replace the whole pending set.
 * Un-hides the banner so a new amendment is visible again.
 */
export function replacePendingAmendmentAlerts(
  alerts: PendingAmendmentAlert[],
  times?: { fromAt?: string | null; updatedAt?: string | null },
): void {
  ensureAmendmentAlertSchema();
  const db = getProductLogDb();
  db.prepare("DELETE FROM pending_amendment_alerts").run();

  if (!alerts.length) {
    setMeta("pending_updated_at", "");
    setMeta("pending_from_at", "");
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO pending_amendment_alerts (
      product_offering_id, name, listed, unlisted, label, updated_at
    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  for (const alert of alerts) {
    stmt.run(
      alert.id,
      alert.name,
      alert.listed ? 1 : 0,
      alert.unlisted ? 1 : 0,
      alert.label,
    );
  }

  const updatedAt = times?.updatedAt?.trim() || new Date().toISOString();
  const fromAt =
    times?.fromAt?.trim() ||
    getLastFetchAt() ||
    "";

  setMeta("pending_updated_at", updatedAt);
  setMeta("pending_from_at", fromAt);
  setBannerHidden(false);
}

export function getPendingAmendmentUpdatedAt(): string | null {
  const raw = getMeta("pending_updated_at")?.trim();
  return raw || null;
}

export function getPendingAmendmentFromAt(): string | null {
  const raw = getMeta("pending_from_at")?.trim();
  return raw || null;
}

/** Explicit dismiss — used on clean Refresh when sync found no new changes. */
export function acknowledgeAmendmentBanner(): void {
  ensureAmendmentAlertSchema();
  getProductLogDb().prepare("DELETE FROM pending_amendment_alerts").run();
  setMeta("pending_updated_at", "");
  setMeta("pending_from_at", "");
  setBannerHidden(true);
}

export function getPendingAmendmentAlertForId(id: string): PendingAmendmentAlert | null {
  ensureAmendmentAlertSchema();
  const row = getProductLogDb()
    .prepare(
      `SELECT product_offering_id, name, listed, unlisted, label
       FROM pending_amendment_alerts
       WHERE product_offering_id = ? COLLATE NOCASE`,
    )
    .get(id) as unknown as PendingRow | undefined;

  if (!row) return null;
  return {
    id: row.product_offering_id,
    name: row.name,
    listed: Boolean(row.listed),
    unlisted: Boolean(row.unlisted),
    label: row.label,
  };
}

export function buildAmendmentAlert(
  id: string,
  name: string,
  changes: AuditFieldChange[],
  action: "INSERT" | "UPDATE" | "unchanged",
): PendingAmendmentAlert | null {
  if (action === "unchanged") return null;
  const flags = classifyTelusChanges(changes);
  if (action === "INSERT" && !flags.listed && !flags.unlisted) {
    flags.unlisted = true;
  }
  const label = formatTelusChangeLabel(flags);
  if (!label) return null;
  return { id, name, listed: flags.listed, unlisted: flags.unlisted, label };
}

/**
 * Persistent list badges from the latest audit_logs row per offering.
 * Not cleared when the warning banner is dismissed.
 */
export function getPlanChangeBadgesFromAudits(
  nameById: Map<string, string>,
): PendingAmendmentAlert[] {
  ensureAmendmentAlertSchema();
  const rows = getProductLogDb()
    .prepare(
      `SELECT a.product_offering_id, a.action_type, a.detected_changes
       FROM audit_logs a
       INNER JOIN (
         SELECT product_offering_id, MAX(id) AS max_id
         FROM audit_logs
         GROUP BY product_offering_id
       ) latest ON latest.max_id = a.id`,
    )
    .all() as unknown as Array<{
      product_offering_id: string;
      action_type: "INSERT" | "UPDATE";
      detected_changes: string;
    }>;

  const badges: PendingAmendmentAlert[] = [];
  for (const row of rows) {
    let changes: AuditFieldChange[] = [];
    try {
      changes = JSON.parse(row.detected_changes) as AuditFieldChange[];
    } catch {
      changes = [{ path: "(root)", from: null, to: "updated" }];
    }
    const alert = buildAmendmentAlert(
      row.product_offering_id,
      nameById.get(row.product_offering_id.trim().toLowerCase()) ??
        row.product_offering_id,
      changes,
      row.action_type,
    );
    if (alert) badges.push(alert);
  }
  return badges;
}

/** Build alerts for the single most recent audit_logs timestamp batch. */
function alertsFromLatestAuditBatch(nameById: Map<string, string>): {
  alerts: PendingAmendmentAlert[];
  changedAt: string | null;
  previousChangedAt: string | null;
} {
  const stamps = getProductLogDb()
    .prepare(
      `SELECT DISTINCT changed_at
       FROM audit_logs
       ORDER BY datetime(changed_at) DESC, changed_at DESC
       LIMIT 2`,
    )
    .all() as unknown as Array<{ changed_at: string }>;

  const latestStamp = stamps[0]?.changed_at;
  if (!latestStamp) {
    return { alerts: [], changedAt: null, previousChangedAt: null };
  }

  const previousChangedAt = stamps[1]?.changed_at ?? null;

  const rows = getProductLogDb()
    .prepare(
      `SELECT product_offering_id, action_type, detected_changes, changed_at
       FROM audit_logs
       WHERE changed_at = ?
       ORDER BY id DESC`,
    )
    .all(latestStamp) as unknown as Array<{
      product_offering_id: string;
      action_type: "INSERT" | "UPDATE";
      detected_changes: string;
      changed_at: string;
    }>;

  const seen = new Set<string>();
  const alerts: PendingAmendmentAlert[] = [];
  for (const row of rows) {
    const key = row.product_offering_id.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    let changes: AuditFieldChange[] = [];
    try {
      changes = JSON.parse(row.detected_changes) as AuditFieldChange[];
    } catch {
      changes = [{ path: "(root)", from: null, to: "updated" }];
    }
    const alert = buildAmendmentAlert(
      row.product_offering_id,
      nameById.get(key) ?? row.product_offering_id,
      changes,
      row.action_type,
    );
    if (alert) alerts.push(alert);
  }

  return {
    alerts,
    changedAt: latestStamp,
    previousChangedAt,
  };
}

/**
 * Banner content: latest change batch only.
 * Stays visible across page loads until acknowledgeAmendmentBanner()
 * (clean Refresh with no new changes).
 */
export function getAmendmentBannerState(nameById: Map<string, string>): {
  amendedPlans: PendingAmendmentAlert[];
  amendedAt: string | null;
  amendedFrom: string | null;
} {
  ensureAmendmentAlertSchema();

  if (isBannerHidden()) {
    return { amendedPlans: [], amendedAt: null, amendedFrom: null };
  }

  let amendedPlans = getPendingAmendmentAlerts();
  let amendedAt = getPendingAmendmentUpdatedAt();
  let amendedFrom = getPendingAmendmentFromAt();

  const latestBatch = alertsFromLatestAuditBatch(nameById);

  if (amendedPlans.length === 0) {
    if (latestBatch.alerts.length > 0) {
      const updatedAt =
        sqliteUtcToIso(latestBatch.changedAt) ?? new Date().toISOString();
      const fromAt =
        sqliteUtcToIso(latestBatch.previousChangedAt) ??
        getLastFetchAt() ??
        null;
      replacePendingAmendmentAlerts(latestBatch.alerts, { fromAt, updatedAt });
      amendedPlans = getPendingAmendmentAlerts();
      amendedAt = getPendingAmendmentUpdatedAt();
      amendedFrom = getPendingAmendmentFromAt();
    }
  } else if (latestBatch.changedAt) {
    // Re-derive times from audit_logs so SQLite UTC is never shown as local
    const fixedAt = sqliteUtcToIso(latestBatch.changedAt);
    const fixedFrom =
      sqliteUtcToIso(latestBatch.previousChangedAt) ?? getLastFetchAt();
    if (fixedAt) {
      setMeta("pending_updated_at", fixedAt);
      amendedAt = fixedAt;
    }
    if (fixedFrom) {
      setMeta("pending_from_at", fixedFrom);
      amendedFrom = fixedFrom;
    } else if (amendedFrom && !amendedFrom.endsWith("Z")) {
      const repaired = sqliteUtcToIso(amendedFrom);
      if (repaired) {
        setMeta("pending_from_at", repaired);
        amendedFrom = repaired;
      }
    }
  }

  return { amendedPlans, amendedAt, amendedFrom };
}
