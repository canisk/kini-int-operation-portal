import type { Plan, PlanRef } from "@/lib/types";
import { planFromOfferingName } from "@/lib/catalog";
import offeringsById from "@/data/product-offerings.json";

export interface ProductOfferingRef {
  name: string;
  id: string;
  href?: string;
  "@referredType"?: string;
}

export interface ProductOffering {
  id: string;
  name: string;
  description?: string;
  version?: string;
  href?: string;
  lifecycleStatus?: string;
  startDateTime?: string;
  endDateTime?: string;
  lastUpdate?: string;
  retirementDateTime?: string;
  isBundle?: boolean;
  isCustomerVisible?: boolean;
  scope?: string;
  "@type"?: string;
  "@baseType"?: string;
  categoryRef?: ProductOfferingRef[];
  productSpecificationRef?: ProductOfferingRef;
  bundledProductOfferingRef?: ProductOfferingRef[];
  productOfferingPriceRef?: ProductOfferingRef[];
  prodSpecCharValueUse?: Array<{
    name?: string;
    charType?: string;
    description?: string;
    isUnique?: boolean;
    configurable?: boolean;
    productSpecCharacteristicValue?: Array<{
      description?: string;
      unitOfMeasure?: string;
      valueType?: string;
      isDefault?: boolean;
      value?: { eq?: string };
    }>;
  }>;
  metadata?: {
    systemTags?: {
      ratingType?: string[];
      categoryType?: string[];
      place?: string[];
      tenantId?: string[];
    };
    userTags?: string[];
    relationships?: {
      promos?: string[];
      parents?: string[][];
      bundles?: string[];
    };
  };
  changeLog?: Array<{
    changeDate?: string;
    changeDescription?: string;
    version?: string;
    changeType?: string;
  }>;
}

function toRefs(items: ProductOfferingRef[] | undefined): PlanRef[] {
  return (items ?? []).map((r) => ({ id: r.id, name: r.name }));
}

function dataFromChars(offering: ProductOffering): {
  data_gb: number | null | undefined;
} {
  const chars = offering.prodSpecCharValueUse?.[0]?.productSpecCharacteristicValue ?? [];
  let data_gb: number | null | undefined;

  for (const c of chars) {
    const eq = c.value?.eq;
    if (eq == null) continue;
    if (c.valueType === "balance" || c.unitOfMeasure === "GB" || c.unitOfMeasure === "MB") {
      const n = Number(eq);
      if (n >= 9999) data_gb = null;
      else if (c.unitOfMeasure === "MB") data_gb = n / 1024;
      else data_gb = n;
    }
  }

  return { data_gb };
}

/** Map CCP ProductOffering → Plan. */
export function planFromProductOffering(offering: ProductOffering): Plan {
  const rating = offering.metadata?.systemTags?.ratingType?.[0]?.toLowerCase() ?? "prepaid";
  const status = offering.lifecycleStatus ?? "Active";

  const base = planFromOfferingName(offering.id, offering.name, rating, status.toLowerCase() === "active" ? "active" : status.toLowerCase());
  const chars = dataFromChars(offering);
  const places = offering.metadata?.systemTags?.place ?? [];

  if (chars.data_gb !== undefined) {
    base.data_gb = chars.data_gb;
  }

  return {
    ...base,
    status, // keep API lifecycleStatus casing (e.g. Active)
    description: offering.description,
    version: offering.version,
    places,
    user_tags: offering.metadata?.userTags ?? [],
    bundled_offerings: toRefs(offering.bundledProductOfferingRef),
    price_refs: toRefs(offering.productOfferingPriceRef),
    start_date: offering.startDateTime,
    end_date: offering.endDateTime,
    last_update: offering.lastUpdate,
    retirement_date: offering.retirementDateTime,
    is_bundle: offering.isBundle,
    is_customer_visible: offering.isCustomerVisible,
    category_type: offering.metadata?.systemTags?.categoryType?.[0],
    change_log: (offering.changeLog ?? [])
      .filter((e) => e.changeDate || e.changeDescription)
      .map((e) => ({
        changeDate: e.changeDate ?? "",
        changeDescription: e.changeDescription ?? "",
        version: e.version ?? "",
        changeType: e.changeType ?? "",
      })),
    relationships: {
      promos: offering.metadata?.relationships?.promos ?? [],
      parents: offering.metadata?.relationships?.parents ?? [],
      bundles: offering.metadata?.relationships?.bundles ?? [],
    },
  };
}

const OFFERING_INDEX: Record<string, ProductOffering> = Object.fromEntries(
  Object.entries(offeringsById as Record<string, ProductOffering>).map(([id, offering]) => [
    id.toLowerCase(),
    offering,
  ]),
);

export function getProductOfferingById(id: string): ProductOffering | null {
  return OFFERING_INDEX[id.trim().toLowerCase()] ?? null;
}
