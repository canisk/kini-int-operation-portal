/**
 * Compare raw ProductOffering JSON keys against the shape we map in the portal.
 * Unknown / missing properties surface as a heads-up on the plan detail page.
 */

export interface OfferingSchemaNotes {
  unknownProperties: string[];
  missingProperties: string[];
}

type SchemaNode = true | { [key: string]: SchemaNode };

/** Allowlisted ProductOffering shape (portal interface + nested known keys). */
const OFFERING_SCHEMA: SchemaNode = {
  id: true,
  name: true,
  description: true,
  version: true,
  href: true,
  lifecycleStatus: true,
  startDateTime: true,
  endDateTime: true,
  lastUpdate: true,
  retirementDateTime: true,
  isBundle: true,
  isCustomerVisible: true,
  scope: true,
  "@type": true,
  "@baseType": true,
  categoryRef: {
    name: true,
    id: true,
    href: true,
    "@referredType": true,
  },
  productSpecificationRef: {
    name: true,
    id: true,
    href: true,
    "@referredType": true,
  },
  bundledProductOfferingRef: {
    name: true,
    id: true,
    href: true,
    "@referredType": true,
  },
  productOfferingPriceRef: {
    name: true,
    id: true,
    href: true,
    "@referredType": true,
  },
  prodSpecCharValueUse: {
    name: true,
    charType: true,
    description: true,
    isUnique: true,
    configurable: true,
    productSpecCharacteristicValue: {
      description: true,
      unitOfMeasure: true,
      valueType: true,
      isDefault: true,
      value: {
        eq: true,
      },
    },
  },
  metadata: {
    systemTags: {
      ratingType: true,
      categoryType: true,
      place: true,
      tenantId: true,
      tenantName: true,
    },
    userTags: true,
    relationships: {
      promos: true,
      parents: true,
      bundles: true,
    },
  },
  changeLog: {
    changeDate: true,
    changeDescription: true,
    version: true,
    changeType: true,
  },
};

/** Core fields we expect on a usable offering (missing = heads-up). */
const EXPECTED_TOP_LEVEL = ["id", "name", "@type", "lifecycleStatus"] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function walkUnknown(
  value: unknown,
  schema: SchemaNode,
  path: string,
  unknown: Set<string>,
): void {
  if (schema === true) return;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (isPlainObject(item) || Array.isArray(item)) {
        walkUnknown(item, schema, path, unknown);
      }
    }
    return;
  }

  if (!isPlainObject(value)) return;

  for (const key of Object.keys(value)) {
    const childPath = path ? `${path}.${key}` : key;
    const childSchema = schema[key];
    if (childSchema == null) {
      unknown.add(childPath);
      continue;
    }
    walkUnknown(value[key], childSchema, childPath, unknown);
  }
}

/**
 * Inspect raw API / mock offering JSON for properties outside our interface.
 */
export function inspectOfferingSchema(raw: unknown): OfferingSchemaNotes {
  const unknown = new Set<string>();
  const missing: string[] = [];

  if (!isPlainObject(raw)) {
    return {
      unknownProperties: ["(root) — payload is not an object"],
      missingProperties: [...EXPECTED_TOP_LEVEL],
    };
  }

  walkUnknown(raw, OFFERING_SCHEMA, "", unknown);

  for (const key of EXPECTED_TOP_LEVEL) {
    if (!(key in raw)) missing.push(key);
  }

  return {
    unknownProperties: [...unknown].sort(),
    missingProperties: missing,
  };
}

export function hasSchemaNotes(notes: OfferingSchemaNotes | null | undefined): boolean {
  if (!notes) return false;
  return notes.unknownProperties.length > 0 || notes.missingProperties.length > 0;
}
