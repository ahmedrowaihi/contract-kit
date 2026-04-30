import type { KtFun } from "../fun.js";
import type { KtVisibility } from "../visibility.js";
import type { KtAnnotation, KtProp } from "./prop.js";

export interface KtEnumEntry {
  name: string;
  /**
   * Pre-rendered argument list for the enum entry's primary
   * constructor call, or undefined for entries without args.
   * E.g., for `AVAILABLE("available")` pass `'"available"'`.
   */
  args?: string;
  annotations?: ReadonlyArray<KtAnnotation>;
}

export interface KtEnum {
  kind: "enum";
  name: string;
  visibility: KtVisibility;
  annotations: ReadonlyArray<KtAnnotation>;
  superTypes: ReadonlyArray<string>;
  /** Constructor-level props (e.g. `val raw: String`). */
  properties: ReadonlyArray<KtProp>;
  entries: ReadonlyArray<KtEnumEntry>;
  funs: ReadonlyArray<KtFun>;
  runtime?: boolean;
}

/**
 * One entry in an enum class.
 *
 * @example
 * ```kotlin
 * // ktEnumEntry("AVAILABLE", '"available"')
 * //   → AVAILABLE("available")
 * ```
 */
export const ktEnumEntry = (
  name: string,
  args?: string,
  annotations?: ReadonlyArray<KtAnnotation>,
): KtEnumEntry => ({ name, args, annotations });

/**
 * Enum class. Pass `properties` for constructor-level fields (the
 * standard pattern for enum-with-raw-value, e.g. JSON serialization).
 *
 * @example
 * ```kotlin
 * // ktEnum({ name: "Status",
 * //          properties: [ktProp({ name: "raw", type: ktString, inPrimary: true })],
 * //          entries: [ktEnumEntry("AVAILABLE", '"available"')] })
 * //   → public enum class Status(public val raw: String) {
 * //         AVAILABLE("available"),
 * //     }
 * ```
 */
export function ktEnum(opts: {
  name: string;
  entries: ReadonlyArray<KtEnumEntry>;
  properties?: ReadonlyArray<KtProp>;
  annotations?: ReadonlyArray<KtAnnotation>;
  superTypes?: ReadonlyArray<string>;
  visibility?: KtVisibility;
  funs?: ReadonlyArray<KtFun>;
  runtime?: boolean;
}): KtEnum {
  return {
    kind: "enum",
    name: opts.name,
    visibility: opts.visibility ?? "public",
    annotations: opts.annotations ?? [],
    superTypes: opts.superTypes ?? [],
    properties: opts.properties ?? [],
    entries: opts.entries,
    funs: opts.funs ?? [],
    runtime: opts.runtime,
  };
}
