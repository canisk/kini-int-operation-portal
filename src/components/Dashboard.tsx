"use client";

import { ChevronRight, Database, MapPin, Tag } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MOCK_PLANS } from "@/lib/mock-data";
import type { AppTab, Plan } from "@/lib/types";

const CHART_COLORS = ["#3a419a", "#fe175b", "#0ea5e9", "#f59e0b", "#10b981"];

const REGION_ORDER = ["CA", "ROC", "QC"] as const;
const REGION_LABELS: Record<string, string> = {
  CA: "Canada",
  QC: "Quebec",
  ROC: "Rest of Canada",
};

const PRICE_BUCKETS = [
  { key: "$0–20", min: 0, max: 20 },
  { key: "$21–40", min: 21, max: 40 },
  { key: "$41–60", min: 41, max: 60 },
  { key: "$61–80", min: 61, max: 80 },
  { key: "$81+", min: 81, max: Infinity },
] as const;

const DATA_BUCKETS = [
  { key: "0 GB", test: (gb: number | null | undefined) => gb === 0 },
  { key: "≤10 GB", test: (gb: number | null | undefined) => typeof gb === "number" && gb > 0 && gb <= 10 },
  { key: "11–50 GB", test: (gb: number | null | undefined) => typeof gb === "number" && gb > 10 && gb <= 50 },
  { key: "51–100 GB", test: (gb: number | null | undefined) => typeof gb === "number" && gb > 50 && gb <= 100 },
  { key: "100+ GB", test: (gb: number | null | undefined) => typeof gb === "number" && gb > 100 },
  { key: "Unlimited", test: (gb: number | null | undefined) => gb === null },
] as const;

function regionFromPlan(plan: Plan): string {
  const match = plan.features.find((f) => f.startsWith("Region: "));
  return match ? match.replace("Region: ", "") : "Other";
}

function priceBucket(price: number): string | null {
  if (price <= 0) return null;
  const bucket = PRICE_BUCKETS.find((b) => price >= b.min && price <= b.max);
  return bucket?.key ?? null;
}

function dataBucket(gb: number | null | undefined): string {
  const hit = DATA_BUCKETS.find((b) => b.test(gb));
  return hit?.key ?? "n/a";
}

interface DashboardProps {
  onNavigate: (tab: AppTab) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const total = MOCK_PLANS.length;

  const countsByRegion = MOCK_PLANS.reduce<Record<string, number>>((acc, plan) => {
    const region = regionFromPlan(plan);
    acc[region] = (acc[region] ?? 0) + 1;
    return acc;
  }, {});

  const regionCounts = [
    ...REGION_ORDER.map((key) => ({
      key,
      name: key,
      label: REGION_LABELS[key] ?? key,
      plans: countsByRegion[key] ?? 0,
    })),
    ...Object.entries(countsByRegion)
      .filter(([key]) => !(REGION_ORDER as readonly string[]).includes(key))
      .map(([key, plans]) => ({
        key,
        name: key,
        label: REGION_LABELS[key] ?? key,
        plans,
      })),
  ].filter((r) => r.plans > 0);

  const priced = MOCK_PLANS.map((p) => p.price).filter((p) => p > 0);
  const minPrice = priced.length ? Math.min(...priced) : null;
  const maxPrice = priced.length ? Math.max(...priced) : null;

  const priceCounts = PRICE_BUCKETS.map((b) => ({
    name: b.key,
    plans: MOCK_PLANS.filter((p) => priceBucket(p.price) === b.key).length,
  })).filter((r) => r.plans > 0);

  const dataCounts = DATA_BUCKETS.map((b) => ({
    name: b.key,
    plans: MOCK_PLANS.filter((p) => dataBucket(p.data_gb) === b.key).length,
  })).filter((r) => r.plans > 0);

  const topRegion = [...regionCounts].sort((a, b) => b.plans - a.plans)[0];

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-extrabold text-foreground">Dashboard</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Snapshot of plan counts by region, price, and data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("all-plans")}
          className="inline-flex items-center justify-center gap-1.5 self-start sm:self-auto rounded-xl bg-primary text-primary-foreground text-sm font-semibold px-3.5 py-2.5 shadow-md shadow-primary/20 hover:opacity-95 transition-opacity"
        >
          Browse all plans
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[
          {
            label: "Total plans",
            value: String(total),
            hint: "In CCP export",
            icon: <Database className="w-3.5 h-3.5" />,
          },
          {
            label: "Top region",
            value: topRegion?.name ?? "—",
            hint: topRegion
              ? `${topRegion.plans} plans · ${topRegion.label}`
              : "No region in name",
            icon: <MapPin className="w-3.5 h-3.5" />,
          },
          {
            label: "Price range",
            value:
              minPrice != null && maxPrice != null ? `$${minPrice}–$${maxPrice}` : "n/a",
            hint: "Parsed from offering name",
            icon: <Tag className="w-3.5 h-3.5" />,
          },
          {
            label: "Priced plans",
            value: String(priced.length),
            hint: `${total - priced.length} without price token`,
            icon: <Tag className="w-3.5 h-3.5" />,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-4"
          >
            <div className="flex items-center gap-1.5 text-primary mb-1">
              {stat.icon}
              <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {stat.label}
              </p>
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums leading-tight">
              {stat.value}
            </p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1 leading-tight">
              {stat.hint}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-5 min-w-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
            Plans by region
          </p>
          <p className="text-[11px] text-muted-foreground mb-3 sm:mb-4">
            From name tokens (CA · ROC · QC)
          </p>
          <div className="h-44 sm:h-52 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionCounts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(58,65,154,0.12)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#6b6f9e" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "#6b6f9e" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(58,65,154,0.06)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(58,65,154,0.12)",
                    fontSize: 12,
                  }}
                  formatter={(value: number, _name, item) => {
                    const label = (item?.payload as { label?: string } | undefined)?.label;
                    return [`${value} plans`, label ?? "Count"];
                  }}
                />
                <Bar dataKey="plans" radius={[8, 8, 0, 0]} maxBarSize={48}>
                  {regionCounts.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {regionCounts.map((r, i) => (
              <span
                key={r.key}
                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                {r.label}
                <span className="font-semibold text-foreground">{r.plans}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-5 min-w-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
            Price bands
          </p>
          <p className="text-[11px] text-muted-foreground mb-3 sm:mb-4">
            From offering name (e.g. $10)
          </p>
          <div className="h-44 sm:h-52 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceCounts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(58,65,154,0.12)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#6b6f9e" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "#6b6f9e" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(58,65,154,0.06)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(58,65,154,0.12)",
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`${value} plans`, "Count"]}
                />
                <Bar dataKey="plans" radius={[8, 8, 0, 0]} maxBarSize={40} fill="#3a419a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-5">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
          Data allowance mix
        </p>
        <p className="text-[11px] text-muted-foreground mb-4">
          From name GB tokens (and unlimited when present)
        </p>
        <ul className="space-y-2.5">
          {dataCounts.map((row, i) => {
            const pct = total > 0 ? Math.round((row.plans / total) * 100) : 0;
            return (
              <li key={row.name} className="min-w-0">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-xs font-semibold text-foreground">{row.name}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {row.plans} · {pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${pct}%`,
                      background: CHART_COLORS[i % CHART_COLORS.length],
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

    </div>
  );
}
