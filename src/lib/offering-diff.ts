export interface FieldChange {
  path: string;
  from: unknown;
  to: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = stableValue(value[key]);
    }
    return out;
  }
  return value;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(stableValue(a)) === JSON.stringify(stableValue(b));
}

/**
 * Deep-diff two JSON-like values. Returns path-level changes suitable for audit_logs.detected_changes.
 */
export function diffObjects(before: unknown, after: unknown, basePath = ""): FieldChange[] {
  if (valuesEqual(before, after)) return [];

  const bothObjects = isPlainObject(before) && isPlainObject(after);
  const bothArrays = Array.isArray(before) && Array.isArray(after);

  if (!bothObjects && !bothArrays) {
    return [{ path: basePath || "(root)", from: before ?? null, to: after ?? null }];
  }

  const changes: FieldChange[] = [];

  if (bothArrays) {
    const max = Math.max(before.length, after.length);
    for (let i = 0; i < max; i++) {
      const path = basePath ? `${basePath}[${i}]` : `[${i}]`;
      if (i >= before.length) {
        changes.push({ path, from: null, to: after[i] });
      } else if (i >= after.length) {
        changes.push({ path, from: before[i], to: null });
      } else {
        changes.push(...diffObjects(before[i], after[i], path));
      }
    }
    return changes;
  }

  const beforeObj = before as Record<string, unknown>;
  const afterObj = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

  for (const key of [...keys].sort()) {
    const path = basePath ? `${basePath}.${key}` : key;
    const hasBefore = Object.prototype.hasOwnProperty.call(beforeObj, key);
    const hasAfter = Object.prototype.hasOwnProperty.call(afterObj, key);

    if (!hasBefore) {
      changes.push({ path, from: null, to: afterObj[key] });
      continue;
    }
    if (!hasAfter) {
      changes.push({ path, from: beforeObj[key], to: null });
      continue;
    }
    changes.push(...diffObjects(beforeObj[key], afterObj[key], path));
  }

  return changes;
}
