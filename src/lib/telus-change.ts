import type { AuditFieldChange } from "@/lib/types";

export interface TelusChangeFlags {
  listed: boolean;
  unlisted: boolean;
}

/** Listed = catalogue changeLog field; Unlisted = any other offering JSON field. */
export function classifyTelusChanges(changes: AuditFieldChange[]): TelusChangeFlags {
  let listed = false;
  let unlisted = false;

  for (const change of changes) {
    const path = change.path ?? "";
    if (path === "changeLog" || path.startsWith("changeLog.") || path.startsWith("changeLog[")) {
      listed = true;
    } else {
      unlisted = true;
    }
  }

  return { listed, unlisted };
}

export function formatTelusChangeLabel(flags: TelusChangeFlags): string | null {
  if (!flags.listed && !flags.unlisted) return null;
  const parts: string[] = [];
  if (flags.listed) parts.push("Listed");
  if (flags.unlisted) parts.push("Unlisted");
  return `⚠️${parts.join(" / ")} change by TELUS`;
}
