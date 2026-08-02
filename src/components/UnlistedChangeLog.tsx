"use client";

import type { AuditFieldChange, AuditLogEntry } from "@/lib/types";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value || '""';
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    const s = JSON.stringify(value);
    return s.length > 160 ? `${s.slice(0, 160)}…` : s;
  } catch {
    return String(value);
  }
}

function ChangeRows({ changes }: { changes: AuditFieldChange[] }) {
  if (!changes.length) {
    return <p className="text-sm text-muted-foreground">No field-level details.</p>;
  }

  return (
    <ul className="mt-2 space-y-2">
      {changes.slice(0, 40).map((change, i) => (
        <li
          key={`${change.path}-${i}`}
          className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2"
        >
          <code className="text-[11px] font-mono text-foreground break-all">{change.path}</code>
          <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-1.5 sm:gap-2 items-start text-xs">
            <span className="text-amber-800/90 break-all font-mono leading-snug">
              {formatValue(change.from)}
            </span>
            <span className="hidden sm:inline text-muted-foreground self-center">→</span>
            <span className="text-emerald-800 break-all font-mono leading-snug">
              {formatValue(change.to)}
            </span>
          </div>
        </li>
      ))}
      {changes.length > 40 && (
        <li className="text-xs text-muted-foreground">+{changes.length - 40} more fields</li>
      )}
    </ul>
  );
}

/** Diff log from auto API pulls vs SQLite — matches Change log section styling. */
export function UnlistedChangeLog({ logs }: { logs: AuditLogEntry[] }) {
  return (
    <div className="px-5 sm:px-6 py-5 border-t border-border">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
        Change log (Unlisted)
      </p>

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
          Compared against the last auto request stored in SQLite. When the next pull (e.g. 8am /
          1pm) returns different JSON, field-level changes appear here.
        </p>
      ) : (
        <ol className="relative space-y-0 border-l border-border ml-1.5">
          {logs.map((entry) => {
            const badge =
              entry.actionType === "INSERT"
                ? "bg-sky-50 text-sky-800"
                : "bg-violet-50 text-violet-800";

            return (
              <li key={entry.id} className="relative pl-5 pb-5 last:pb-0">
                <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-card" />
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>
                    {entry.actionType}
                  </span>
                  <time className="text-[11px] text-muted-foreground">
                    {formatWhen(entry.changedAt)}
                  </time>
                  <span className="text-[11px] text-muted-foreground">
                    {entry.detectedChanges.length} field
                    {entry.detectedChanges.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ChangeRows changes={entry.detectedChanges} />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
