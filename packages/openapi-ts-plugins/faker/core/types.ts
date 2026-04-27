import type { Faker } from "@faker-js/faker";

export interface PropertyInfo {
  type: string;
  format?: string;
  name: string;
  /**
   * Set when this property is a `$ref` to another schema. The builder calls
   * `opts.resolveRef(ref)` to emit a reference (e.g. a call to a sibling
   * factory) instead of inlining the target schema. Avoids infinite recursion
   * for cyclic schemas and matches the zod-plugin / openapi-ts ref-by-symbol
   * convention.
   */
  $ref?: string;
  enum?: (string | number | boolean)[];
  /** Set for `oneOf`/`anyOf` schemas. Builder emits a runtime random pick. */
  variants?: PropertyInfo[];
  children?: Record<string, PropertyInfo>;
  items?: PropertyInfo;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
}

export interface ResponseSchemaInfo {
  properties: Record<string, PropertyInfo>;
  isArray: boolean;
}

/**
 * All `module.method` paths on the Faker instance whose method is callable
 * with zero arguments. Methods that require arguments (e.g.
 * `helpers.arrayElement`, `helpers.fromRegExp`) are excluded so they cannot
 * be used as field-name or format hints — those would emit empty calls.
 */
type ExtractZeroArgFakerPaths<T> = {
  [K in keyof T]: K extends string
    ? T[K] extends object
      ? {
          [M in keyof T[K]]: M extends string
            ? T[K][M] extends () => unknown
              ? `${K}.${M}`
              : never
            : never;
        }[keyof T[K]]
      : never
    : never;
}[keyof T];

export type FakerMethodPath = ExtractZeroArgFakerPaths<Faker>;

export type FieldNameHints = Record<string, FakerMethodPath>;
export type FormatMapping = Record<string, FakerMethodPath>;
