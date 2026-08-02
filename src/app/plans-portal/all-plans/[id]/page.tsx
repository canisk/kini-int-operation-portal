"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Code, Eye, Loader2 } from "lucide-react";
import { fetchPlanById } from "@/lib/api";
import type { PlanByIdResponse } from "@/lib/types";
import { PlanDetailPage } from "@/components/PlanDetail";

export default function PlanByIdPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? decodeURIComponent(params.id) : "";

  const [response, setResponse] = useState<PlanByIdResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Plan ID is required");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setResponse(null);
    setShowRaw(false);

    void (async () => {
      try {
        const data = await fetchPlanById(id);
        if (cancelled) return;
        if (data.plan) {
          setResponse(data);
        } else {
          setError(data.error ?? `Plan not found: ${id}`);
        }
      } catch {
        if (!cancelled) setError(`Failed to load plan ${id}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-semibold text-foreground">Loading plan details…</p>
        <code className="text-xs text-muted-foreground font-mono break-all max-w-full px-4 text-center">
          GET /api/v1/plans/{id || ":id"}
        </code>
      </div>
    );
  }

  if (error || !response?.plan) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/plans-portal/all-plans")}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          ← Back to all plans
        </button>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {error || "Plan not found"}
        </div>
      </div>
    );
  }

  const jsonPayload = response.offering ?? response;

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/plans-portal/all-plans")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all plans
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              response.status === 200
                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                : "text-amber-800 bg-amber-50 border-amber-200"
            }`}
          >
            {response.status} {response.status === 200 ? "OK" : "Error"}
          </span>
          <span className="text-xs font-mono text-muted-foreground truncate">
            {response.endpoint}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shrink-0 ${
            showRaw
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {showRaw ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
          {showRaw ? "Card" : "JSON"}
        </button>
      </div>

      {showRaw ? (
        <div className="bg-[#0d0f2b] rounded-2xl overflow-hidden border border-primary/20">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
            <code className="text-[10px] text-white/40 font-mono">
              GET /api/v1/plans/{id}
            </code>
          </div>
          <pre className="p-5 text-xs font-mono overflow-x-auto text-emerald-300 leading-relaxed max-h-[70vh] overflow-y-auto">
            <code>{JSON.stringify(jsonPayload, null, 2)}</code>
          </pre>
        </div>
      ) : (
        <PlanDetailPage
          plan={response.plan}
          onBack={() => router.push("/plans-portal/all-plans")}
          hideBack
          telusChangeLabel={response.sync?.telusChangeLabel}
          auditLogs={response.auditLogs ?? []}
          schemaNotes={response.schemaNotes}
        />
      )}
    </div>
  );
}
