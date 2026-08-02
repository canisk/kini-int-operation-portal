"use client";

import type { OfferingSchemaNotes } from "@/lib/offering-schema";

/** Heads-up when API JSON keys don't match our ProductOffering interface. */
export function SchemaHeadsUp({ notes }: { notes: OfferingSchemaNotes }) {
  const hasUnknown = notes.unknownProperties.length > 0;
  const hasMissing = notes.missingProperties.length > 0;
  if (!hasUnknown && !hasMissing) return null;

  return (
    <div className="px-5 sm:px-6 py-5 border-t border-border bg-amber-50/60">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
        Schema notice
      </p>
      <p className="text-sm text-foreground leading-relaxed mb-3">
        The fetched JSON includes properties that don&apos;t match our portal interface. Map or
        ignore these before relying on sync / display.
      </p>

      {hasUnknown && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-amber-950 mb-1.5">
            Unknown properties ({notes.unknownProperties.length})
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {notes.unknownProperties.map((path) => (
              <li key={path}>
                <code className="text-[11px] font-mono font-semibold px-2 py-1 rounded-md border border-amber-200 bg-white text-amber-950">
                  {path}
                </code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasMissing && (
        <div>
          <p className="text-xs font-semibold text-amber-950 mb-1.5">
            Missing expected properties ({notes.missingProperties.length})
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {notes.missingProperties.map((path) => (
              <li key={path}>
                <code className="text-[11px] font-mono font-semibold px-2 py-1 rounded-md border border-amber-200 bg-white text-amber-950">
                  {path}
                </code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
