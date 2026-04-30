import { camel } from "@ahmedrowaihi/oas-core";

import { paramIdent } from "../identifiers.js";

export interface PropertyName {
  /** The original key as it appears in the OpenAPI schema / JSON wire format. */
  jsonKey: string;
  /** The idiomatic Kotlin identifier the generated data class uses (already
   *  backtick-escaped if it would collide with a reserved keyword). */
  kotlinName: string;
  /** True when the kotlin name differs from the JSON key — emit
   *  `@SerialName(jsonKey)` on the property. */
  renamed: boolean;
}

/**
 * Translate an OpenAPI property name into a Kotlin identifier following
 * lower-camelCase conventions. When the result differs from the JSON
 * key the caller is responsible for emitting a `@SerialName` annotation
 * to preserve wire compatibility.
 *
 *   first_name   → firstName   (renamed)
 *   first-name   → firstName   (renamed)
 *   firstName    → firstName   (no rename)
 *   id           → id          (no rename)
 *   class        → `class`     (no rename, but escaped — caller still
 *                              emits `@SerialName("class")` to avoid
 *                              the backticks being part of the wire)
 */
export function propertyName(jsonKey: string): PropertyName {
  const camelName = camel(jsonKey);
  const kotlinName = paramIdent(jsonKey);
  // Backtick-escaping for reserved keywords doesn't constitute a rename
  // for serialization purposes (the wire still uses the bare name), but
  // we still emit `@SerialName` because kotlinx-serialization sees the
  // backticked form as a distinct identifier.
  const renamed = camelName !== jsonKey;
  return { jsonKey, kotlinName, renamed };
}
