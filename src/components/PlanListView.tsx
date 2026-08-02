"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronRight, Code, Eye, Loader2, RefreshCw, Search, X } from "lucide-react";
import { fetchPlanList } from "@/lib/api";
import type { PlanListResponse, PlanSummary } from "@/lib/types";
import { categoryIcon } from "@/components/planHelpers";
import { TelusChangeBadge } from "@/components/PlanDetail";

export default function PlanListView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [response, setResponse] = useState<PlanListResponse | null>(null);
  const [error, setError] = useState("");
  const [fetchedAt, setFetchedAt] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [searchId, setSearchId] = useState("");

  const loadList = async () => {
    setLoading(true);
    setResponse(null);
    setError("");
    try {
      const data = await fetchPlanList();
      setResponse(data);
      setFetchedAt(new Date().toLocaleTimeString());
    } catch {
      setError("Failed to reach /api/v1/plans");
    } finally {
      setLoading(false);
    }
  };

  const openPlanDetail = (id: string) => {
    if (openingId) return;
    setOpeningId(id);
    router.push(`/plans-portal/all-plans/${encodeURIComponent(id)}`);
  };

  useEffect(() => {
    void loadList();
  }, []);

  /** Persistent under-ID badges (survive banner clear). */
  const flaggedById = useMemo(() => {
    const map = new Map<string, NonNullable<PlanListResponse["flaggedPlans"]>[number]>();
    for (const item of response?.flaggedPlans ?? []) {
      map.set(item.id.trim().toLowerCase(), item);
    }
    return map;
  }, [response]);

  const filteredPlans = useMemo(() => {
    if (!response) return [];
    const q = searchId.trim().toLowerCase();
    if (!q) return response.plans;
    return response.plans.filter(
      (plan) =>
        plan.id.toLowerCase().includes(q) ||
        plan.name.toLowerCase().includes(q),
    );
  }, [response, searchId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <div className="w-10 h-10 border-primary/20 border-t-primary rounded-full animate-spin" style={{ borderWidth: 3 }} />
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Fetching plan list…</p>
          <code className="text-xs text-muted-foreground font-mono">GET /api/v1/plans</code>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        {error}
      </div>
    );
  }

  if (!response) return null;

  const amendedPlans = response.amendedPlans ?? [];

  return (
    <div className="space-y-4 min-w-0">
      <div>
        <h2 className="text-lg sm:text-xl font-extrabold text-foreground">All Plans</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Click a plan to open its full detail page.
        </p>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mt-2">
          CCP · MainPlanPrepaid_Kini
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          placeholder="Filter by plan ID or name…"
          className="w-full h-11 pl-10 pr-10 rounded-xl border border-border bg-card text-base sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono"
          aria-label="Filter plans by ID"
        />
        {searchId && (
          <button
            type="button"
            onClick={() => setSearchId("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear filter"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {amendedPlans.length > 0 && (
        <div
          className="rounded-xl border border-amber-300/80 bg-[#FFF6D6] px-4 py-3.5 shadow-sm"
          role="alert"
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFCF00]/80">
              <AlertTriangle className="w-3.5 h-3.5 text-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground leading-snug">
                {amendedPlans.length} product offering
                {amendedPlans.length === 1 ? "" : "s"} amended
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Banner clears on the next clean API fetch. Plan badges stay under each ID.
              </p>
              <ul className="mt-2.5 space-y-2 border-t border-amber-200/80 pt-2.5">
                {amendedPlans.map((plan) => (
                  <li key={plan.id} className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-snug">{plan.name}</p>
                    <code className="mt-0.5 block text-[11px] font-mono text-muted-foreground break-all">
                      {plan.id}
                    </code>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            {response.status} OK
          </span>
          <span className="text-xs font-mono text-muted-foreground truncate">{response.endpoint}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {searchId.trim()
              ? `${filteredPlans.length} of ${response.count} plans`
              : `${response.count} plans`}
            {fetchedAt && <span className="ml-1.5 text-muted-foreground/60">· {fetchedAt}</span>}
          </span>
          <button
            type="button"
            onClick={() => void loadList()}
            className="p-1.5 rounded-lg bg-card border border-border hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              showRaw
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {showRaw ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
            {showRaw ? "List" : "JSON"}
          </button>
        </div>
      </div>

      {showRaw ? (
        <div className="bg-[#0d0f2b] rounded-2xl overflow-hidden border border-primary/20">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
            <code className="text-[10px] text-white/40 font-mono">GET /api/v1/plans</code>
          </div>
          <pre className="p-5 text-xs font-mono overflow-x-auto text-emerald-300 leading-relaxed max-h-[60vh] overflow-y-auto">
            <code>{JSON.stringify(response, null, 2)}</code>
          </pre>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl px-4 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">No plans match “{searchId.trim()}”</p>
          <p className="text-xs text-muted-foreground mt-1">Try another plan ID or clear the filter.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <ul className="divide-y divide-border">
            {filteredPlans.map((plan: PlanSummary) => {
              const isOpening = openingId === plan.id;
              const flag = flaggedById.get(plan.id.trim().toLowerCase());
              return (
                <li key={plan.id}>
                  <button
                    type="button"
                    onClick={() => openPlanDetail(plan.id)}
                    disabled={Boolean(openingId)}
                    className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors group ${
                      isOpening
                        ? "bg-primary/5"
                        : "hover:bg-muted/60 disabled:opacity-60"
                    }`}
                  >
                    <span className="text-primary shrink-0 mt-0.5">
                      {categoryIcon(plan.category)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground leading-snug">
                        {plan.name}
                      </span>
                      <code className="mt-1 block text-[11px] font-mono text-muted-foreground break-all">
                        {plan.id}
                      </code>
                      {flag && <TelusChangeBadge label={flag.label} />}
                      {isOpening && (
                        <span className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Opening details…
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground group-hover:text-primary shrink-0 mt-0.5">
                      {!isOpening && (
                        <>
                          <span className="hidden sm:inline">View</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
