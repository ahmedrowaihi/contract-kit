import { camel } from "@ahmedrowaihi/codegen-core";

export interface PropertyName {
  /** The original key as it appears in the OpenAPI schema / JSON wire format. */
  jsonKey: string;
  /** The idiomatic Swift identifier the generated struct uses. */
  swiftName: string;
  /** True when `swiftName !== jsonKey` and a `CodingKeys` rename is required. */
  renamed: boolean;
}

/**
 * Translate an OpenAPI property name into a Swift identifier following
 * lower-camelCase conventions. When the result differs from the input,
 * the caller is responsible for emitting a `CodingKeys` entry.
 *
 *   first_name   → firstName   (renamed)
 *   first-name   → firstName   (renamed)
 *   firstName    → firstName   (no rename)
 *   id           → id          (no rename)
 */
export function propertyName(jsonKey: string): PropertyName {
  const swiftName = camel(jsonKey);
  return {
    jsonKey,
    swiftName,
    renamed: swiftName !== jsonKey,
  };
}
