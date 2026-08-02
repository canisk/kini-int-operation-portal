const fs = require("fs");
const path = require("path");

// Inline minimal copy of inspector for smoke test (mirrors src/lib/offering-schema.ts allowlist)
const OFFERING_SCHEMA = {
  id: true, name: true, description: true, version: true, href: true,
  lifecycleStatus: true, startDateTime: true, endDateTime: true, lastUpdate: true,
  retirementDateTime: true, isBundle: true, isCustomerVisible: true, scope: true,
  "@type": true, "@baseType": true,
  categoryRef: { name: true, id: true, href: true, "@referredType": true },
  productSpecificationRef: { name: true, id: true, href: true, "@referredType": true },
  bundledProductOfferingRef: { name: true, id: true, href: true, "@referredType": true },
  productOfferingPriceRef: { name: true, id: true, href: true, "@referredType": true },
  prodSpecCharValueUse: {
    name: true, charType: true, description: true, isUnique: true, configurable: true,
    productSpecCharacteristicValue: {
      description: true, unitOfMeasure: true, valueType: true, isDefault: true,
      value: { eq: true },
    },
  },
  metadata: {
    systemTags: { ratingType: true, categoryType: true, place: true, tenantId: true, tenantName: true },
    userTags: true,
    relationships: { promos: true, parents: true, bundles: true },
  },
  changeLog: { changeDate: true, changeDescription: true, version: true, changeType: true },
};

function walk(value, schema, path, unknown) {
  if (schema === true) return;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item && typeof item === "object") walk(item, schema, path, unknown);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const key of Object.keys(value)) {
    const childPath = path ? `${path}.${key}` : key;
    const childSchema = schema[key];
    if (childSchema == null) {
      unknown.add(childPath);
      continue;
    }
    walk(value[key], childSchema, childPath, unknown);
  }
}

const offerings = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/data/product-offerings.json"), "utf8"),
);
const sample = offerings["offering_v1.0_637e0d1bce1-991bfa44f0b8"];
const unknown = new Set();
walk(sample, OFFERING_SCHEMA, "", unknown);
console.log([...unknown].sort());
