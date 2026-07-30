import type { Plan } from "@/lib/types";
import catalog from "@/data/main-plan-prepaid.json";

interface ProductOfferingRef {
  name: string;
  id: string;
  href?: string;
  "@referredType"?: string;
}

interface CatalogCategory {
  name: string;
  lifecycleStatus?: string;
  description?: string;
  productOfferingRef?: ProductOfferingRef[];
  metadata?: {
    systemTags?: {
      ratingType?: string[];
      categoryType?: string[];
    };
  };
}

const REGIONS = new Set(["CA", "ROC", "QC"]);

function parseDataGb(token: string): number | undefined {
  const t = token.trim().toLowerCase();
  const gb = t.match(/^(\d+(?:\.\d+)?)\s*gb$/i);
  if (gb) return Number(gb[1]);
  const mb = t.match(/^(\d+(?:\.\d+)?)\s*mb$/i);
  if (mb) return Number(mb[1]) / 1024;
  return undefined;
}

function parsePrice(token: string): number | undefined {
  const t = token.trim();
  const withDollar = t.match(/^\$(\d+(?:\.\d+)?)$/);
  if (withDollar) return Number(withDollar[1]);
  // Some names omit `$` (e.g. "| 28 | 50GB |")
  if (/^\d+(?:\.\d+)?$/.test(t)) return Number(t);
  return undefined;
}

function parseAllowance(token: string, unit: "min" | "sms" | "mms"): string | undefined {
  const t = token.trim().toLowerCase();
  const re =
    unit === "min"
      ? /^(\d+(?:\.\d+)?)\s*(k)?\s*min(?:s|utes?)?$/i
      : unit === "sms"
        ? /^(\d+(?:\.\d+)?)\s*(k)?\s*sms$/i
        : /^(\d+(?:\.\d+)?)\s*(k)?\s*mms$/i;
  const m = t.match(re);
  if (!m) {
    if (t === "0min" || t === "0mins") return unit === "min" ? "0" : undefined;
    if (t === "0sms") return unit === "sms" ? "0" : undefined;
    if (t === "0mms") return unit === "mms" ? "0" : undefined;
    return undefined;
  }
  const n = m[1];
  const hasK = Boolean(m[2]) || /k/i.test(t);
  const amount = hasK ? `${n}K` : n;
  return amount;
}

/** Parse CCP productOfferingRef name → Plan fields. */
export function planFromOfferingName(
  id: string,
  name: string,
  category = "prepaid",
  status = "active",
): Plan {
  const parts = name.split("|").map((p) => p.trim()).filter(Boolean);

  let region: string | undefined;
  let price = 0;
  let data_gb: number | null | undefined = undefined;
  let dataSeen = false;
  let calls = "";
  let sms: string | null = null;
  const features: string[] = [];
  const leftover: string[] = [];

  for (const part of parts) {
    const upper = part.toUpperCase();
    if (REGIONS.has(upper)) {
      region = upper;
      continue;
    }
    const p = parsePrice(part);
    if (p !== undefined && price === 0) {
      price = p;
      continue;
    }
    const d = parseDataGb(part);
    if (d !== undefined) {
      data_gb = d;
      dataSeen = true;
      continue;
    }
    const mins = parseAllowance(part, "min");
    if (mins !== undefined) {
      calls = mins;
      continue;
    }
    const smsVal = parseAllowance(part, "sms");
    if (smsVal !== undefined) {
      sms = smsVal;
      continue;
    }
    const mms = parseAllowance(part, "mms");
    if (mms !== undefined) {
      features.push(`MMS: ${mms}`);
      continue;
    }
    // Skip generic prefixes
    if (/^(kini|prepaid\s*mainplan|mainplan|prepaid)$/i.test(part)) continue;
    leftover.push(part);
  }

  if (region) features.unshift(`Region: ${region}`);
  for (const f of leftover) {
    if (/^unlimited$/i.test(f)) {
      if (!dataSeen) data_gb = null;
      else features.push(f);
      continue;
    }
    features.push(f);
  }

  return {
    id,
    name,
    category,
    price,
    data_gb,
    calls,
    sms,
    features,
    status,
  };
}

function categoryFromTags(cat: CatalogCategory): string {
  const rating = cat.metadata?.systemTags?.ratingType?.[0];
  return (rating ?? "prepaid").toLowerCase();
}

function statusFromLifecycle(lifecycle?: string): string {
  if (!lifecycle) return "active";
  return lifecycle.toLowerCase() === "active" ? "active" : lifecycle.toLowerCase();
}

/** Map CCP Category (`productOfferingRef`) → Plan[]. */
function plansFromCategory(raw: CatalogCategory): Plan[] {
  const category = categoryFromTags(raw);
  const status = statusFromLifecycle(raw.lifecycleStatus);
  const refs = raw.productOfferingRef ?? [];
  return refs.map((ref) => planFromOfferingName(ref.id, ref.name, category, status));
}

/** Map CCP Category → list summaries only. */
export function summariesFromCategory(raw: CatalogCategory): { id: string; name: string; category: string }[] {
  const category = categoryFromTags(raw);
  return (raw.productOfferingRef ?? []).map((ref) => ({
    id: ref.id,
    name: ref.name,
    category,
  }));
}

const category = catalog as CatalogCategory;

/** Prepaid main-plan catalogue from CCP export. */
export const CATALOG_PLANS: Plan[] = plansFromCategory(category);
