import { preserveMetadata } from "./metadata.js";
import type { NamingConfig } from "./name.js";
import { applyNaming, uniqueComponentName } from "./name.js";
import {
  getSchemasObject,
  isRootSchemaPath,
  schemasPointerPrefix,
  walkSchemas,
} from "./walk.js";

export interface ObjectPassOptions {
  naming?: NamingConfig;
  /** Skip shapes with fewer than this many properties. Default: 3. */
  minProperties?: number;
}

const DEFAULT_NAMING: NamingConfig = {
  case: "PascalCase",
  name: "{{name}}Object",
};

/**
 * Hoist structurally identical inline objects to `components.schemas`.
 * Inline-only — never merges with existing roots, since structural
 * equality is too weak a signal for object identity. Returns the set
 * of newly-added schema names.
 */
export function dedupeInlineObjects(
  spec: unknown,
  opts: ObjectPassOptions = {},
): Set<string> {
  const hoisted = new Set<string>();
  const schemas = getSchemasObject(spec);
  if (!schemas) return hoisted;
  const pointerPrefix = schemasPointerPrefix(spec);
  if (!pointerPrefix) return hoisted;

  const naming = opts.naming ?? DEFAULT_NAMING;
  const minProperties = Math.max(1, opts.minProperties ?? 3);

  interface InlineHit {
    parent: Record<string, unknown> | unknown[];
    key: string | number;
    signature: string;
    schema: unknown;
  }

  const groups = new Map<string, InlineHit[]>();
  walkSchemas(spec, ({ key, node, parent, path }) => {
    if (key === null || parent === null) return;
    if (isRootSchemaPath(path)) return;
    const signature = objectSignature(node, minProperties);
    if (!signature) return;
    const hit: InlineHit = {
      parent: parent as Record<string, unknown> | unknown[],
      key: key as string | number,
      signature,
      schema: node,
    };
    const arr = groups.get(signature);
    if (arr) arr.push(hit);
    else groups.set(signature, [hit]);
  });
  if (groups.size === 0) return hoisted;

  const nameBySignature = new Map<string, string>();
  const schemaBySignature = new Map<string, unknown>();
  const reservedNames = new Set<string>();

  for (const [signature, hits] of groups) {
    if (hits.length < 2) continue;
    const first = hits[0];
    if (!first) continue;
    const baseSource = canonicalBase(first.schema, first.key);
    if (!hasUsableName(first.schema, baseSource)) continue;
    const base = applyNaming(baseSource, naming);
    const name = uniqueComponentName(base, schemas, reservedNames);
    reservedNames.add(name);
    nameBySignature.set(signature, name);
    schemaBySignature.set(signature, first.schema);
  }

  for (const [signature, name] of nameBySignature) {
    if (name in schemas) continue;
    const schema = schemaBySignature.get(signature);
    if (schema && typeof schema === "object") {
      const target = schema as Record<string, unknown>;
      preserveMetadata(groups.get(signature) ?? [], target);
      schemas[name] = target;
      hoisted.add(name);
    }
  }

  for (const [signature, hits] of groups) {
    const name = nameBySignature.get(signature);
    if (!name) continue;
    for (const { parent, key } of hits) {
      const ref = { $ref: `${pointerPrefix}${name}` };
      if (Array.isArray(parent)) parent[key as number] = ref;
      else parent[key as string] = ref;
    }
  }
  return hoisted;
}

function objectSignature(
  schema: unknown,
  minProperties: number,
): string | undefined {
  if (!schema || typeof schema !== "object") return undefined;
  const s = schema as Record<string, unknown>;
  if (s.$ref) return undefined;
  if (Array.isArray(s.enum)) return undefined;
  if (s.type !== undefined && s.type !== "object") return undefined;
  // Composition / conditional keywords change semantics if folded.
  if (
    "allOf" in s ||
    "anyOf" in s ||
    "oneOf" in s ||
    "not" in s ||
    "if" in s ||
    "then" in s ||
    "else" in s
  ) {
    return undefined;
  }
  const properties = s.properties;
  if (
    !properties ||
    typeof properties !== "object" ||
    Array.isArray(properties)
  ) {
    return undefined;
  }
  const propNames = Object.keys(properties).sort();
  if (propNames.length < minProperties) return undefined;

  const required = Array.isArray(s.required)
    ? [...(s.required as string[])].sort()
    : [];
  const propsForSig = propNames.map((name) => [
    name,
    propertySignature((properties as Record<string, unknown>)[name]),
  ]);
  return JSON.stringify({
    properties: propsForSig,
    required,
    additionalProperties: additionalPropertiesSignature(s.additionalProperties),
  });
}

/** Recursive structural hash of a property's shape. */
function propertySignature(node: unknown): string {
  if (!node || typeof node !== "object") return "?";
  const s = node as Record<string, unknown>;
  if (typeof s.$ref === "string") return `ref:${s.$ref}`;
  if (Array.isArray(s.enum)) {
    return `enum:${JSON.stringify({
      type: s.type ?? "",
      format: s.format ?? "",
      values: [...(s.enum as unknown[])].sort(),
    })}`;
  }
  const type = (s.type ?? "any") as string;
  if (type === "array") {
    const items = (s as { items?: unknown }).items;
    return `array<${propertySignature(items ?? null)}>`;
  }
  if (type === "object" || s.properties) {
    const props = s.properties as Record<string, unknown> | undefined;
    const propPairs = props
      ? Object.keys(props)
          .sort()
          .map((k) => [k, propertySignature(props[k])])
      : [];
    const required = Array.isArray(s.required)
      ? [...(s.required as string[])].sort()
      : [];
    return `object:${JSON.stringify({
      properties: propPairs,
      required,
      additionalProperties: additionalPropertiesSignature(
        s.additionalProperties,
      ),
    })}`;
  }
  const format = s.format ? `:${s.format as string}` : "";
  return `${type}${format}`;
}

function additionalPropertiesSignature(value: unknown): string {
  if (value === undefined) return "u";
  if (value === false) return "false";
  if (value === true) return "true";
  return propertySignature(value);
}

function canonicalBase(schema: unknown, key: string | number): string {
  if (schema && typeof schema === "object" && "title" in schema) {
    const title = (schema as Record<string, unknown>).title;
    if (typeof title === "string" && title) return title;
  }
  return String(key);
}

/** Reject numeric / generic keys that would yield meaningless type names like `0Object` or `DataObject`. Title overrides. */
const GENERIC_KEYS: ReadonlySet<string> = new Set([
  "attributes",
  "body",
  "config",
  "content",
  "data",
  "details",
  "fields",
  "info",
  "item",
  "items",
  "key",
  "metadata",
  "name",
  "options",
  "params",
  "parameters",
  "payload",
  "properties",
  "props",
  "request",
  "response",
  "result",
  "results",
  "schema",
  "settings",
  "value",
  "values",
]);

function hasUsableName(schema: unknown, base: string): boolean {
  if (schema && typeof schema === "object" && "title" in schema) {
    const title = (schema as Record<string, unknown>).title;
    if (typeof title === "string" && title) return true;
  }
  if (!base) return false;
  if (/^\d+$/.test(base)) return false;
  return !GENERIC_KEYS.has(base.toLowerCase());
}
