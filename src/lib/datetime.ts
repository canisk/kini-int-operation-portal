/**
 * SQLite CURRENT_TIMESTAMP is UTC without a timezone suffix.
 * Parsing it as local time shifts display (e.g. 17:28 EDT → 9:28 PM EDT).
 */
export function sqliteUtcToIso(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  const normalized = trimmed.includes("T")
    ? trimmed
    : trimmed.replace(" ", "T");
  const d = new Date(`${normalized}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function formatBannerDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  });
}
