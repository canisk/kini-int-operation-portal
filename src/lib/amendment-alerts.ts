import { getProductLogDb } from "@/lib/db";
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

function getAckMaxAuditId(): number {
  const raw = getMeta("ack_max_audit_id");
  const n = raw == null ? 0 : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function setAckMaxAuditId(id: number): void {
  setMeta("ack_max_audit_id", String(id));
}

function currentMaxAuditId(): number {
  const row = getProductLogDb()
    .prepare("SELECT COALESCE(MAX(id), 0) AS max_id FROM audit_logs")
    .get() as unknown as { max_id: number | bigint };
  return Number(row.max_id ?? 0);
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

export function upsertPendingAmendmentAlerts(alerts: PendingAmendmentAlert[]): void {
  if (!alerts.length) return;
  ensureAmendmentAlertSchema();
  const stmt = getProductLogDb().prepare(`
    INSERT INTO pending_amendment_alerts (
      product_offering_id, name, listed, unlisted, label, updated_at
    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(product_offering_id) DO UPDATE SET
      name = excluded.name,
      listed = CASE WHEN excluded.listed = 1 OR pending_amendment_alerts.listed = 1 THEN 1 ELSE 0 END,
      unlisted = CASE WHEN excluded.unlisted = 1 OR pending_amendment_alerts.unlisted = 1 THEN 1 ELSE 0 END,
      label = excluded.label,
      updated_at = CURRENT_TIMESTAMP
  `);

  for (const alert of alerts) {
    const existing = getPendingAmendmentAlertForId(alert.id);
    const listed = alert.listed || Boolean(existing?.listed);
    const unlisted = alert.unlisted || Boolean(existing?.unlisted);
    const label = formatTelusChangeLabel({ listed, unlisted }) ?? alert.label;
    stmt.run(alert.id, alert.name, listed ? 1 : 0, unlisted ? 1 : 0, label);
  }
}

export function clearPendingAmendmentAlerts(): void {
  ensureAmendmentAlertSchema();
  setAckMaxAuditId(currentMaxAuditId());
  getProductLogDb().prepare("DELETE FROM pending_amendment_alerts").run();
  setMeta("pending_shown_at", "");
}

export function markAmendmentAlertsShown(): void {
  setMeta("pending_shown_at", String(Date.now()));
}

/**
 * On a clean list fetch: keep returning pending alerts for a short grace window
 * (React Strict Mode remounts), then clear so the next refresh hides them.
 */
export function takePendingAmendmentAlertsForCleanFetch(
  graceMs = 8_000,
): PendingAmendmentAlert[] {
  const pending = getPendingAmendmentAlerts();
  if (pending.length === 0) return [];

  const shownRaw = getMeta("pending_shown_at");
  const shownAt = shownRaw ? Number(shownRaw) : 0;

  if (!shownAt) {
    markAmendmentAlertsShown();
    return pending;
  }

  if (Date.now() - shownAt < graceMs) {
    return pending;
  }

  clearPendingAmendmentAlerts();
  return [];
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
 * Pull unacknowledged audit_logs into pending alerts
 * (covers changes already written before the list page loaded).
 */
export function hydratePendingAlertsFromUnaackedAudits(
  nameById: Map<string, string>,
): PendingAmendmentAlert[] {
  ensureAmendmentAlertSchema();
  const ack = getAckMaxAuditId();
  const rows = getProductLogDb()
    .prepare(
      `SELECT a.product_offering_id, a.action_type, a.detected_changes
       FROM audit_logs a
       INNER JOIN (
         SELECT product_offering_id, MAX(id) AS max_id
         FROM audit_logs
         WHERE id > ?
         GROUP BY product_offering_id
       ) latest ON latest.max_id = a.id`,
    )
    .all(ack) as unknown as Array<{
      product_offering_id: string;
      action_type: "INSERT" | "UPDATE";
      detected_changes: string;
    }>;

  const alerts: PendingAmendmentAlert[] = [];
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
    if (alert) alerts.push(alert);
  }

  if (alerts.length > 0) {
    upsertPendingAmendmentAlerts(alerts);
    // New alerts must be shown again (ignore stale shown timestamp)
    setMeta("pending_shown_at", "");
  }
  return getPendingAmendmentAlerts();
}
