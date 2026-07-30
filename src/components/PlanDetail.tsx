"use client";

import type { ReactNode } from "react";
import { ArrowLeft, MessageSquare, Phone, Wifi } from "lucide-react";
import type { Plan } from "@/lib/types";

function formatData(plan: Plan): string {
    if (plan.data_gb === undefined) return "n/a";
    if (plan.data_gb === null) return "Unlimited";
    if (plan.data_gb === 0) return "0 GB";
    if (plan.data_gb < 1) return `${Math.round(plan.data_gb * 1024)} MB`;
    return `${plan.data_gb} GB`;
}

function placeCodes(places: string[] | undefined): string[] {
    if (!places?.length) return [];
    // Keep API values as-is (e.g. ca-ab, ca-bc)
    return [...places];
}

function formatDate(iso?: string): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function detailsFromName(plan: Plan) {
    const regionCode = plan.features
        .find((f) => f.startsWith("Region: "))
        ?.replace("Region: ", "");
    const regionLabels: Record<string, string> = {
        CA: "Canada",
        QC: "Quebec",
        ROC: "Rest of Canada",
    };
    const region = regionCode
        ? (regionLabels[regionCode.toUpperCase()] ?? regionCode)
        : undefined;
    const mms = plan.features
        .find((f) => f.startsWith("MMS: "))
        ?.replace("MMS: ", "");

    return {
        region,
        price: plan.price > 0 ? `$${plan.price}` : null,
        data: formatData(plan),
        calls: plan.calls || "n/a",
        sms: plan.sms || "n/a",
        mms: mms || "n/a",
    };
}

function SectionTitle({ children }: { children: ReactNode }) {
    return (
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
            {children}
        </p>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    const isLong = value.length > 40;
    if (isLong) {
        return (
            <div className="flex flex-col gap-1 py-2.5">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="text-sm font-semibold text-foreground font-mono break-all leading-relaxed">
                    {value}
                </dd>
            </div>
        );
    }
    return (
        <div className="flex items-baseline justify-between gap-6 py-2.5">
            <dt className="text-sm text-muted-foreground shrink-0">{label}</dt>
            <dd className="text-sm font-semibold text-foreground text-right">
                {value}
            </dd>
        </div>
    );
}

function PlanDescription({ plan }: { plan: Plan }) {
    if (!plan.description) return null;
    return (
        <div>
            <p className="text-sm text-muted-foreground mb-1.5">Description</p>
            <p className="text-sm text-foreground leading-relaxed">
                {plan.description}
            </p>
        </div>
    );
}

function PlanFacts({ plan }: { plan: Plan }) {
    const fromName = detailsFromName(plan);
    const places = placeCodes(plan.places);

    const rows: { label: string; value: string; icon?: ReactNode }[] = [
        fromName.region ? { label: "Region", value: fromName.region } : null,
        fromName.price ? { label: "Price", value: fromName.price } : null,
        {
            label: "Data",
            value: fromName.data,
            icon: <Wifi className="w-3.5 h-3.5 text-primary" />,
        },
        {
            label: "Minutes",
            value: fromName.calls,
            icon: <Phone className="w-3.5 h-3.5 text-primary" />,
        },
        {
            label: "SMS",
            value: fromName.sms,
            icon: <MessageSquare className="w-3.5 h-3.5 text-primary" />,
        },
        { label: "MMS", value: fromName.mms },
    ].filter(Boolean) as { label: string; value: string; icon?: ReactNode }[];

    return (
        <div>
            <SectionTitle>Plan Overview</SectionTitle>
            <div className="rounded-xl border border-border overflow-hidden bg-card">
                {rows.length > 0 && (
                    <dl className="divide-y divide-border">
                        {rows.map((row) => (
                            <div
                                key={row.label}
                                className="flex items-center justify-between gap-4 px-4 py-3"
                            >
                                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                                    {row.icon}
                                    {row.label}
                                </dt>
                                <dd className="text-sm font-semibold text-foreground text-right tabular-nums">
                                    {row.value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}
                <div className="border-t border-border px-3.5 py-3">
                    <p className="text-sm text-muted-foreground mb-2">Place</p>
                    {places.length === 0 ? (
                        <p className="text-sm text-muted-foreground">n/a</p>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {places.map((code) => (
                                <span
                                    key={code}
                                    className="inline-flex items-center text-[11px] font-mono font-semibold px-2 py-1 rounded-md border border-border bg-muted/60 text-foreground"
                                >
                                    {code}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function PlanDetailHeader({ plan }: { plan: Plan }) {
    return (
        <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        plan.status.toLowerCase() === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                    }`}
                >
                    {plan.status}
                </span>
                {plan.category && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {plan.category}
                    </span>
                )}
                {plan.category_type && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
                        {plan.category_type}
                    </span>
                )}
                {plan.is_bundle && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
                        Bundle
                    </span>
                )}
                {plan.version && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        v{plan.version}
                    </span>
                )}
            </div>
            <h1
                id="plan-detail-title"
                className="text-lg sm:text-xl font-extrabold text-foreground leading-snug text-balance"
            >
                {plan.name}
            </h1>
        </div>
    );
}

function RefList({
    title,
    items,
}: {
    title: string;
    items: { id: string; name: string }[] | undefined;
}) {
    const list = items ?? [];
    return (
        <div>
            <SectionTitle>{title}</SectionTitle>
            {list.length === 0 ? (
                <p className="text-sm text-muted-foreground">n/a</p>
            ) : (
                <ul className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                    {list.map((item) => (
                        <li
                            key={item.id}
                            className="px-3.5 py-2.5 bg-card min-w-0"
                        >
                            <p className="text-sm font-medium text-foreground leading-snug">
                                {item.name}
                            </p>
                            <code className="mt-0.5 block text-[11px] font-mono text-muted-foreground break-all">
                                {item.id}
                            </code>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function RelationshipsBlock({
    relationships,
}: {
    relationships: NonNullable<Plan["relationships"]>;
}) {
    const blocks: {
        key: string;
        label: string;
        empty: boolean;
        content: ReactNode;
    }[] = [
        {
            key: "parents",
            label: "parents",
            empty: relationships.parents.length === 0,
            content: (
                <ul className="space-y-2">
                    {relationships.parents.map((group, i) => (
                        <li
                            key={i}
                            className="rounded-lg bg-muted/50 border border-border px-3 py-2 space-y-1"
                        >
                            {group.map((id) => (
                                <code
                                    key={id}
                                    className="block text-[11px] font-mono text-foreground break-all"
                                >
                                    {id}
                                </code>
                            ))}
                        </li>
                    ))}
                </ul>
            ),
        },
        {
            key: "promos",
            label: "promos",
            empty: relationships.promos.length === 0,
            content: (
                <ul className="space-y-1">
                    {relationships.promos.map((id) => (
                        <li key={id}>
                            <code className="text-[11px] font-mono text-foreground break-all">
                                {id}
                            </code>
                        </li>
                    ))}
                </ul>
            ),
        },
        {
            key: "bundles",
            label: "bundles",
            empty: relationships.bundles.length === 0,
            content: (
                <ul className="space-y-1">
                    {relationships.bundles.map((id) => (
                        <li key={id}>
                            <code className="text-[11px] font-mono text-foreground break-all">
                                {id}
                            </code>
                        </li>
                    ))}
                </ul>
            ),
        },
    ];

    return (
        <div>
            <SectionTitle>Relationships</SectionTitle>
            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                {blocks.map((block) => (
                    <div key={block.key} className="px-3.5 py-3 bg-card">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                            {block.label}
                        </p>
                        {block.empty ? (
                            <p className="text-sm text-muted-foreground">n/a</p>
                        ) : (
                            block.content
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Wide detail card — fields only from ProductOffering JSON. */
export function PlanDetailCard({ plan }: { plan: Plan }) {
    const summaryRows: { label: string; value: string }[] = [
        { label: "ID", value: plan.id },
        plan.category_type
            ? { label: "Category", value: plan.category_type }
            : null,
        plan.category ? { label: "Rating type", value: plan.category } : null,
        plan.is_customer_visible != null
            ? {
                  label: "Customer visible",
                  value: plan.is_customer_visible ? "Yes" : "No",
              }
            : null,
        plan.is_bundle != null
            ? { label: "Bundle", value: plan.is_bundle ? "Yes" : "No" }
            : null,
        formatDate(plan.start_date)
            ? { label: "Start Date Time", value: formatDate(plan.start_date)! }
            : null,
        formatDate(plan.end_date)
            ? { label: "End Date Time", value: formatDate(plan.end_date)! }
            : null,
        formatDate(plan.last_update)
            ? { label: "Last update", value: formatDate(plan.last_update)! }
            : null,
        formatDate(plan.retirement_date)
            ? { label: "Retirement", value: formatDate(plan.retirement_date)! }
            : null,
        {
            label: "User tags",
            value: plan.user_tags?.length ? plan.user_tags.join(", ") : "n/a",
        },
    ].filter(Boolean) as { label: string; value: string }[];

    return (
        <section
            aria-labelledby="plan-detail-title"
            className="bg-card border border-border rounded-2xl overflow-hidden w-full"
        >
            <div className="px-5 sm:px-6 py-5 border-b border-border">
                <PlanDetailHeader plan={plan} />
            </div>

            <div className="px-5 sm:px-6 py-5 space-y-8">
                <PlanDescription plan={plan} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                    <div className="order-2 lg:order-1">
                        <SectionTitle>Summary</SectionTitle>
                        <div className="rounded-xl border border-border overflow-hidden bg-card">
                            <dl className="divide-y divide-border px-3.5">
                                {summaryRows.map((row) => (
                                    <SummaryRow
                                        key={row.label}
                                        label={row.label}
                                        value={row.value}
                                    />
                                ))}
                            </dl>
                        </div>
                    </div>

                    <div className="order-1 lg:order-2">
                        <PlanFacts plan={plan} />
                    </div>
                </div>

                {plan.relationships && (
                    <RelationshipsBlock relationships={plan.relationships} />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <RefList
                        title="bundled Product Offering Ref"
                        items={plan.bundled_offerings}
                    />
                    <RefList
                        title="product Offering Price Ref"
                        items={plan.price_refs}
                    />
                </div>
            </div>

            {plan.change_log && plan.change_log.length > 0 && (
                <div className="px-5 sm:px-6 py-5 border-t border-border">
                    <SectionTitle>Change log</SectionTitle>
                    <ol className="relative space-y-0 border-l border-border ml-1.5">
                        {[...plan.change_log]
                            .sort(
                                (a, b) =>
                                    new Date(b.changeDate).getTime() -
                                    new Date(a.changeDate).getTime(),
                            )
                            .map((entry, i) => {
                                const type = entry.changeType.toLowerCase();
                                const badge =
                                    type === "active"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : type === "retired"
                                          ? "bg-amber-50 text-amber-800"
                                          : "bg-muted text-muted-foreground";
                                return (
                                    <li
                                        key={`${entry.changeDate}-${entry.changeType}-${i}`}
                                        className="relative pl-5 pb-5 last:pb-0"
                                    >
                                        <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-card" />
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}
                                            >
                                                {entry.changeType || "Update"}
                                            </span>
                                            {entry.version && (
                                                <span className="text-[10px] font-medium text-muted-foreground">
                                                    v{entry.version}
                                                </span>
                                            )}
                                            <time className="text-[11px] text-muted-foreground">
                                                {formatDate(entry.changeDate) ??
                                                    entry.changeDate}
                                            </time>
                                        </div>
                                        <p className="text-sm text-foreground leading-snug">
                                            {entry.changeDescription}
                                        </p>
                                    </li>
                                );
                            })}
                    </ol>
                </div>
            )}
        </section>
    );
}

/** Full-page plan details — used from All Plans. */
export function PlanDetailPage({
    plan,
    onBack,
    hideBack = false,
}: {
    plan: Plan;
    onBack: () => void;
    hideBack?: boolean;
}) {
    return (
        <div className="space-y-4 sm:space-y-6 min-w-0">
            {!hideBack && (
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to all plans
                </button>
            )}

            <PlanDetailCard plan={plan} />
        </div>
    );
}
