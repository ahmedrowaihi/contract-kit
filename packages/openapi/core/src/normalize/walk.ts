/**
 * Pattern adapted from @hey-api/openapi-ts (MIT) —
 * `packages/shared/src/openApi/shared/transforms/enums.ts`.
 * Walker, root-path detection, and pointer-prefix logic mirror the
 * upstream private helpers, which aren't re-exported.
 */

/** JSON Schema keywords that hold child schemas. */
const CHILD_SCHEMA_KEYWORDS: ReadonlyArray<string> = [
  "additionalProperties",
  "allOf",
  "anyOf",
  "contains",
  "dependentSchemas",
  "else",
  "if",
  "items",
  "oneOf",
  "patternProperties",
  "properties",
  "propertyNames",
  "then",
  "unevaluatedProperties",
];

export interface SchemaNode {
  key: string | number | null;
  node: unknown;
  parent: unknown;
  path: ReadonlyArray<string | number>;
}

/** Visit every schema-shaped object in `spec`. */
export function walkSchemas(
  spec: unknown,
  visit: (n: SchemaNode) => void,
): void {
  walk({ key: null, node: spec, parent: null, path: [] }, visit);
}

function walk(n: SchemaNode, visit: (n: SchemaNode) => void): void {
  const { node, path } = n;
  if (!node || typeof node !== "object" || Array.isArray(node)) return;

  const value = node as Record<string, unknown>;
  if (isSchemaShaped(value)) visit(n);

  for (const [k, v] of Object.entries(value)) {
    if (v === null || typeof v !== "object") continue;
    if (Array.isArray(v)) {
      v.forEach((item, index) =>
        walk(
          { key: index, node: item, parent: v, path: [...path, k, index] },
          visit,
        ),
      );
    } else {
      walk({ key: k, node: v, parent: node, path: [...path, k] }, visit);
    }
  }
}

function isSchemaShaped(value: Record<string, unknown>): boolean {
  if ("type" in value || "enum" in value) return true;
  for (const keyword of CHILD_SCHEMA_KEYWORDS) {
    if (keyword in value) return true;
  }
  return false;
}

/** True when `path` points at `components.schemas.<X>` or `definitions.<X>`. */
export function isRootSchemaPath(
  path: ReadonlyArray<string | number>,
): boolean {
  if (path.length === 3 && path[0] === "components" && path[1] === "schemas") {
    return true;
  }
  return path.length === 2 && path[0] === "definitions";
}

/** Pointer prefix for shared schemas (OpenAPI 3.x or Swagger 2.0). */
export function schemasPointerPrefix(spec: unknown): string {
  if (!spec || typeof spec !== "object") return "";
  if ("openapi" in spec) return "#/components/schemas/";
  if ("swagger" in spec) return "#/definitions/";
  return "";
}

/** Live handle on the spec's shared-schema map; creates containers if absent. */
export function getSchemasObject(
  spec: unknown,
): Record<string, unknown> | undefined {
  if (!spec || typeof spec !== "object") return undefined;
  const s = spec as Record<string, unknown>;
  if ("openapi" in s) {
    const components = (s.components ?? {}) as Record<string, unknown>;
    s.components = components;
    const schemas = (components.schemas ?? {}) as Record<string, unknown>;
    components.schemas = schemas;
    return schemas;
  }
  if ("swagger" in s) {
    const defs = (s.definitions ?? {}) as Record<string, unknown>;
    s.definitions = defs;
    return defs;
  }
  return undefined;
}
