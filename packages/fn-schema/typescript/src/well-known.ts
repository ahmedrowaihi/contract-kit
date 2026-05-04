import type { JSONSchema } from "@ahmedrowaihi/fn-schema-core";

export const SENTINEL_KEY = "__fn_schema_marker";

export const WELL_KNOWN_SCHEMAS: Record<string, JSONSchema> = {
  Date: { type: "string", format: "date-time" },
  URL: { type: "string", format: "uri" },
  RegExp: { type: "string", format: "regex" },
  File: { type: "string", format: "binary" },
  Blob: { type: "string", format: "binary" },
  Buffer: { type: "string", contentEncoding: "base64" },
  Uint8Array: { type: "string", contentEncoding: "base64" },
  ArrayBuffer: { type: "string", contentEncoding: "base64" },
  bigint: { type: "integer" },
  BigInt: { type: "integer" },
};

export const WELL_KNOWN_NAMES: ReadonlySet<string> = new Set(
  Object.keys(WELL_KNOWN_SCHEMAS),
);

export const NOT_REPRESENTABLE: ReadonlySet<string> = new Set([
  "symbol",
  "Symbol",
  "unique symbol",
]);

/** Built-in mappings that lose information — paired with a reason for the diagnostic. */
export const LOSSY_REASONS: Record<string, string> = {
  bigint: "JSON numbers cannot represent the full bigint range",
  BigInt: "JSON numbers cannot represent the full bigint range",
};

export function sentinelTypeAlias(name: string): string {
  return `__FnSchemaMap_${name.replace(/[^A-Za-z0-9_]/g, "_")}`;
}

export function renderSentinelDeclaration(name: string): string {
  return `type ${sentinelTypeAlias(name)} = { readonly ${SENTINEL_KEY}: "${name}" };`;
}

export function detectSentinel(schema: unknown): string | null {
  if (!schema || typeof schema !== "object") return null;
  const props = (schema as { properties?: Record<string, unknown> }).properties;
  if (!props || typeof props !== "object") return null;
  const marker = (props as Record<string, unknown>)[SENTINEL_KEY];
  if (!marker || typeof marker !== "object") return null;
  const constVal = (marker as { const?: unknown }).const;
  return typeof constVal === "string" ? constVal : null;
}
