import type { Schema } from "../types";
import { detectIntegerFormat, detectStringFormat } from "./format";

/** Infer a JSON Schema from a single JSON value. */
export function inferSchema(value: unknown): Schema {
  if (value === null) {
    return { type: "null" };
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { type: "array", items: {} };
    }
    let merged: Schema = inferSchema(value[0]);
    for (let i = 1; i < value.length; i++) {
      merged = mergeSchema(merged, inferSchema(value[i]));
    }
    return { type: "array", items: merged };
  }
  switch (typeof value) {
    case "string": {
      const format = detectStringFormat(value);
      return format ? { type: "string", format } : { type: "string" };
    }
    case "number":
      return Number.isInteger(value)
        ? { type: "integer", format: detectIntegerFormat(value) }
        : { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "object": {
      const properties: Record<string, Schema> = {};
      const required: string[] = [];
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        properties[k] = inferSchema(v);
        required.push(k);
      }
      return {
        type: "object",
        properties,
        ...(required.length > 0 ? { required } : {}),
      };
    }
    default:
      return {};
  }
}

/**
 * Merge two schemas inferred from different samples of the same field.
 * Required-field rule: a property is `required` only if it's required in
 * BOTH inputs (intersection). Type widening: same type → keep; different
 * primitive types → emit `type` array (e.g. `["string", "null"]`).
 */
export function mergeSchema(a: Schema, b: Schema): Schema {
  // Identity / empty cases.
  if (isEmpty(a)) return b;
  if (isEmpty(b)) return a;

  const aTypes = typeArray(a);
  const bTypes = typeArray(b);
  const types = unique([...aTypes, ...bTypes]);

  // If both are pure objects, merge property-wise.
  if (types.length === 1 && types[0] === "object") {
    return mergeObject(a, b);
  }

  // If both are arrays, merge items.
  if (types.length === 1 && types[0] === "array") {
    const aItems = (a.items as Schema | undefined) ?? {};
    const bItems = (b.items as Schema | undefined) ?? {};
    return { type: "array", items: mergeSchema(aItems, bItems) };
  }

  // Same primitive type — preserve `format` only if both agree.
  if (types.length === 1) {
    const t = types[0];
    const merged: Schema = { type: t as Schema["type"] };
    const aFormat = (a as { format?: string }).format;
    const bFormat = (b as { format?: string }).format;
    if (aFormat && aFormat === bFormat) {
      (merged as { format?: string }).format = aFormat;
    }
    return merged;
  }

  // Mixed primitive types — widen via `type` array; drop format.
  return { type: types as Schema["type"] };
}

function mergeObject(a: Schema, b: Schema): Schema {
  const aProps = (a.properties ?? {}) as Record<string, Schema>;
  const bProps = (b.properties ?? {}) as Record<string, Schema>;
  const allKeys = new Set([...Object.keys(aProps), ...Object.keys(bProps)]);
  const properties: Record<string, Schema> = {};
  for (const k of allKeys) {
    if (aProps[k] && bProps[k]) {
      properties[k] = mergeSchema(aProps[k], bProps[k]);
    } else {
      properties[k] = aProps[k] ?? bProps[k];
    }
  }
  // Required = intersection.
  const aReq = new Set((a.required as string[] | undefined) ?? []);
  const bReq = new Set((b.required as string[] | undefined) ?? []);
  const required = [...aReq].filter((k) => bReq.has(k));
  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

function isEmpty(s: Schema): boolean {
  return Object.keys(s).length === 0;
}

function typeArray(s: Schema): string[] {
  if (!s.type) return [];
  return Array.isArray(s.type) ? (s.type as string[]) : [s.type as string];
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}
