import type { AnySchema } from "@orpc/contract";
import type {
  ConditionalSchemaConverter,
  JSONSchema,
  SchemaConvertOptions,
} from "@orpc/openapi";

/**
 * The shape of what typia.json.schema<T>() returns at build time.
 * It's a collection with a top-level $ref pointing into components.schemas.
 */
interface TypiaJsonSchemaCollection {
  version: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components?: { schemas?: Record<string, any> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any;
}

/**
 * A Standard Schema object (what typia.createValidate<T>() produces in v11)
 * extended with a Typia JSON schema collection for OpenAPI generation.
 */
export interface TypiaSchema<Input = unknown, Output = Input> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) =>
      | { value: Output }
      | {
          issues: ReadonlyArray<{
            message: string;
            path?: ReadonlyArray<{ key: string | number }>;
          }>;
        };
    readonly types?: { readonly input: Input; readonly output: Output };
  };
  /** Typia JSON schema collection — attached at build time */
  readonly _typiaCollection: TypiaJsonSchemaCollection;
}

/**
 * Resolves a Typia JSON schema collection into a plain JSON Schema object
 * suitable for oRPC's OpenAPI generator.
 *
 * - Single type → inlines the schema directly
 * - Multiple types (nested) → uses `$defs` for referenced schemas
 */
function resolveTypiaCollection(
  collection: TypiaJsonSchemaCollection,
): Exclude<JSONSchema, boolean> {
  const schemas = collection.components?.schemas ?? {};
  const schemaKeys = Object.keys(schemas);
  const topSchema = collection.schema;

  if (schemaKeys.length === 0) return topSchema;

  // Single type: resolve the top-level $ref inline
  if (schemaKeys.length === 1 && typeof topSchema.$ref === "string") {
    const refKey = topSchema.$ref.replace("#/components/schemas/", "");
    return schemas[refKey] ?? topSchema;
  }

  // Complex type with nested schemas: embed as $defs so $refs resolve correctly
  return { ...topSchema, $defs: schemas };
}

/**
 * Combines a Typia Standard Schema (from `typia.createValidate<T>()`) with
 * its JSON schema collection (from `typia.json.schema<T>()`) into an object
 * that oRPC accepts for both validation and OpenAPI spec generation.
 *
 * Must be used with Typia's compiler transformer active (unplugin-typia).
 *
 * @example
 * const UserSchema = ot.schema<User>(
 *   typia.createValidate<User>(),
 *   typia.json.schema<User>(),
 * )
 */
export function createTypiaSchema<
  S extends {
    "~standard": {
      version: 1;
      vendor: string;
      validate: (value: unknown) => any;
    };
  },
>(
  standardSchema: S,
  collection: TypiaJsonSchemaCollection,
): S & { readonly _typiaCollection: TypiaJsonSchemaCollection } {
  return {
    ...standardSchema,
    _typiaCollection: collection,
  };
}

/**
 * Converts a TypiaSchema into JSON Schema for oRPC's OpenAPI generator.
 *
 * Register alongside ZodToJsonSchemaConverter in SmartCoercionPlugin:
 *
 * @example
 * new SmartCoercionPlugin({
 *   schemaConverters: [
 *     new ZodToJsonSchemaConverter(),
 *     new TypiaToJsonSchemaConverter(),
 *   ],
 * })
 */
export class TypiaToJsonSchemaConverter implements ConditionalSchemaConverter {
  condition(schema: AnySchema | undefined): boolean {
    return (
      schema !== undefined &&
      "_typiaCollection" in schema &&
      (schema as any)["~standard"]?.vendor === "typia"
    );
  }

  convert(
    schema: AnySchema | undefined,
    _options: SchemaConvertOptions,
  ): [required: boolean, jsonSchema: Exclude<JSONSchema, boolean>] {
    const typiaSchema = schema as unknown as TypiaSchema;
    return [true, resolveTypiaCollection(typiaSchema._typiaCollection)];
  }
}

/** Shorthand — mirrors oRPC's `oz` (Zod) helper */
export const ot = {
  schema: createTypiaSchema,
};
