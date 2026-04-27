import type { AnySchema } from "@orpc/contract";
import type {
  ConditionalSchemaConverter,
  JSONSchema,
  SchemaConvertOptions,
} from "@orpc/openapi";

const TWIN_SUFFIX = "JsonSchema";
const COMPONENTS_EXPORT_NAME = "typiaJsonComponents";
const REF_PREFIX = "#/components/schemas/";

interface TypiaJsonComponents {
  readonly schemas?: Readonly<Record<string, unknown>>;
}

export type TypiaGeneratedModule = Readonly<Record<string, unknown>> & {
  readonly [COMPONENTS_EXPORT_NAME]?: TypiaJsonComponents;
};

export interface CreateTypiaSchemaConverterOptions {
  readonly twinSuffix?: string;
}

export function createTypiaSchemaConverter(
  generatedModule: TypiaGeneratedModule,
  options: CreateTypiaSchemaConverterOptions = {},
): ConditionalSchemaConverter {
  const twinSuffix = options.twinSuffix ?? TWIN_SUFFIX;
  const componentSchemas = (generatedModule[COMPONENTS_EXPORT_NAME]?.schemas ??
    {}) as Record<string, unknown>;

  // SmartCoercionPlugin's coercer doesn't forward a components map,
  // so $refs must be inlined at build time.
  const twinByValidator = new WeakMap<object, JSONSchema>();
  for (const [key, value] of Object.entries(generatedModule)) {
    if (key.endsWith(twinSuffix)) continue;
    if (typeof value !== "function") continue;
    const twin = generatedModule[`${key}${twinSuffix}`];
    if (twin === undefined) continue;
    twinByValidator.set(
      value as object,
      inlineRefs(twin, componentSchemas) as JSONSchema,
    );
  }

  return {
    condition(
      schema: AnySchema | undefined,
      _options: SchemaConvertOptions,
    ): boolean {
      return isTypiaValidator(schema) && twinByValidator.has(schema as object);
    },
    convert(
      schema: AnySchema | undefined,
      _options: SchemaConvertOptions,
    ): [required: boolean, jsonSchema: JSONSchema] {
      const twin = twinByValidator.get(schema as object);
      if (twin === undefined) {
        throw new Error(
          "createTypiaSchemaConverter: missing JSON schema twin for validator",
        );
      }
      return [true, twin];
    },
  };
}

function isTypiaValidator(schema: unknown): schema is object {
  if (schema === null) return false;
  if (typeof schema !== "object" && typeof schema !== "function") return false;
  const std = (schema as { "~standard"?: { vendor?: string } })["~standard"];
  return std?.vendor === "typia";
}

function inlineRefs(
  node: unknown,
  components: Record<string, unknown>,
  seen: ReadonlySet<string> = new Set(),
): unknown {
  if (Array.isArray(node))
    return node.map((item) => inlineRefs(item, components, seen));
  if (node === null || typeof node !== "object") return node;

  const obj = node as Record<string, unknown>;
  const ref = obj.$ref;
  if (typeof ref === "string" && ref.startsWith(REF_PREFIX)) {
    const name = ref.slice(REF_PREFIX.length);
    if (seen.has(name)) return { ...obj };
    const target = components[name];
    if (target === undefined) return { ...obj };
    return inlineRefs(target, components, new Set(seen).add(name));
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj))
    out[k] = inlineRefs(v, components, seen);
  return out;
}
