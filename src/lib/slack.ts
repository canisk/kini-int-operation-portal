import https from "node:https";
import { URL } from "node:url";
import type { PendingAmendmentAlert } from "@/lib/amendment-alerts";
import type { FieldChange } from "@/lib/offering-diff";

export interface SlackAmendmentPayload {
  triggeredBy: string;
  source?: string;
  amendments: Array<{
    id: string;
    name: string;
    label: string;
    action?: string;
    changeCount?: number;
    changes?: FieldChange[];
  }>;
}

function webhookUrl(): string | null {
  const url = process.env.SLACK_WEBHOOK_URL?.trim();
  return url || null;
}

function isTlsCertError(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code)
      : "";
  const cause =
    error && typeof error === "object" && "cause" in error
      ? (error as { cause?: { code?: string } }).cause
      : undefined;
  const causeCode = cause?.code ? String(cause.code) : "";
  const combined = `${code} ${causeCode} ${String(error)}`;
  return (
    combined.includes("UNABLE_TO_VERIFY_LEAF_SIGNATURE") ||
    combined.includes("CERT_HAS_EXPIRED") ||
    combined.includes("DEPTH_ZERO_SELF_SIGNED_CERT") ||
    combined.includes("SELF_SIGNED_CERT_IN_CHAIN") ||
    combined.includes("unable to verify the first certificate")
  );
}

function postWebhook(
  url: string,
  body: string,
  rejectUnauthorized: boolean,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        rejectUnauthorized,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * Post JSON to Slack. Retries once with relaxed TLS if a corporate proxy
 * breaks leaf certificate verification (common on Windows corp networks).
 */
async function postSlackJson(url: string, payload: unknown): Promise<void> {
  const body = JSON.stringify(payload);
  const forceInsecure = process.env.SLACK_TLS_INSECURE === "true";

  try {
    const res = await postWebhook(url, body, !forceInsecure);
    if (!res.status || res.status >= 400) {
      console.error("[slack] webhook failed", res.status, res.body);
    }
  } catch (error) {
    if (!forceInsecure && isTlsCertError(error)) {
      console.warn(
        "[slack] TLS verify failed (likely SSL inspection); retrying with SLACK_TLS_INSECURE behavior",
      );
      try {
        const res = await postWebhook(url, body, false);
        if (!res.status || res.status >= 400) {
          console.error("[slack] webhook failed", res.status, res.body);
        }
      } catch (retryError) {
        console.error("[slack] webhook error", retryError);
      }
      return;
    }
    console.error("[slack] webhook error", error);
  }
}

function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value || '""';
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    const s = JSON.stringify(value);
    return s.length > 120 ? `${s.slice(0, 120)}…` : s;
  } catch {
    return String(value);
  }
}

function formatFieldChangeLine(change: FieldChange): string {
  const from = formatChangeValue(change.from);
  const to = formatChangeValue(change.to);
  return `⚠️ ${change.path}: ${from} → ${to}`;
}

/** Strip leading warning emoji from UI labels for Slack body lines. */
function slackLabel(label: string): string {
  return label.replace(/^⚠️\s*/, "").trim();
}

/**
 * Post a channel alert when product offering JSON differs from the last SQLite snapshot.
 * No-op when SLACK_WEBHOOK_URL is unset.
 */
export async function notifySlackOfAmendments(
  payload: SlackAmendmentPayload,
): Promise<void> {
  const url = webhookUrl();
  if (!url) return;
  if (!payload.amendments.length) return;

  const blocks = payload.amendments.slice(0, 25).map((a, i) => {
    const count =
      a.changeCount != null
        ? a.changeCount
        : (a.changes?.length ?? undefined);
    const countText = count != null ? ` · ${count} field(s)` : "";
    const action = a.action ? ` [${a.action}]` : "";
    const changeLines = (a.changes ?? [])
      .slice(0, 20)
      .map(formatFieldChangeLine);
    const moreChanges =
      (a.changes?.length ?? 0) > 20
        ? `⚠️ …and ${(a.changes?.length ?? 0) - 20} more field(s)`
        : null;

    return [
      `${i + 1}. ${a.name}${action}${countText}`,
      `ID: ${a.id}`,
      slackLabel(a.label),
      ...changeLines,
      moreChanges,
    ]
      .filter(Boolean)
      .join("\n");
  });

  const more =
    payload.amendments.length > 25
      ? `\n…and ${payload.amendments.length - 25} more`
      : "";

  const text = [
    `⚠️Product offering changes detected`,
    `Trigger: ${payload.triggeredBy}${payload.source ? ` · source: ${payload.source}` : ""}`,
    "",
    `Count: ${payload.amendments.length}`,
    ...blocks,
    more,
  ]
    .filter((line) => line !== null)
    .join("\n");

  await postSlackJson(url, { text });
}

export async function notifySlackFromAlerts(
  triggeredBy: string,
  alerts: PendingAmendmentAlert[],
  extras?: {
    source?: string;
    changeCounts?: Map<string, number>;
    actions?: Map<string, string>;
    changesById?: Map<string, FieldChange[]>;
  },
): Promise<void> {
  if (!alerts.length) return;
  await notifySlackOfAmendments({
    triggeredBy,
    source: extras?.source,
    amendments: alerts.map((a) => {
      const key = a.id.trim().toLowerCase();
      return {
        id: a.id,
        name: a.name,
        label: a.label,
        action: extras?.actions?.get(key),
        changeCount: extras?.changeCounts?.get(key),
        changes: extras?.changesById?.get(key),
      };
    }),
  });
}
