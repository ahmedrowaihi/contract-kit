import type { SwAccess } from "../access.js";
import type { SwFun } from "../fun.js";
import type { SwType } from "../type/types.js";

export interface SwEnumAssoc {
  label?: string;
  type: SwType;
}

export interface SwEnumCase {
  name: string;
  rawValue?: string | number;
  assocs?: ReadonlyArray<SwEnumAssoc>;
}

export interface SwEnum {
  kind: "enum";
  name: string;
  access: SwAccess;
  rawType?: SwType;
  conforms: ReadonlyArray<string>;
  cases: ReadonlyArray<SwEnumCase>;
  funs: ReadonlyArray<SwFun>;
  runtime?: boolean;
}

/**
 * One enum case. Pass `rawValue` for a raw-typed enum, or `assocs`
 * for a sum-type payload — but not both.
 *
 * @example
 * ```swift
 * // swEnumCase("active")                       → case active
 * // swEnumCase("pending", "PENDING")           → case pending = "PENDING"
 * // swEnumCase("bearer", undefined, [swAssoc(swString, "token")])
 * //                                            → case bearer(token: String)
 * ```
 */
export const swEnumCase = (
  name: string,
  rawValue?: string | number,
  assocs?: ReadonlyArray<SwEnumAssoc>,
): SwEnumCase => ({ name, rawValue, assocs });

/**
 * Associated value on an enum case.
 *
 * @example
 * ```swift
 * // swAssoc(swString, "token") → token: String
 * // swAssoc(swRef("Error"))    → Error  (no label)
 * ```
 */
export const swAssoc = (type: SwType, label?: string): SwEnumAssoc => ({
  type,
  label,
});

/**
 * Top-level enum decl.
 *
 * @example
 * ```swift
 * // swEnum({ name: "QueryStyle",
 * //          cases: [swEnumCase("form"), swEnumCase("spaceDelimited")] })
 * //   → public enum QueryStyle { case form; case spaceDelimited }
 * ```
 */
export function swEnum(opts: {
  name: string;
  cases: ReadonlyArray<SwEnumCase>;
  rawType?: SwType;
  conforms?: ReadonlyArray<string>;
  access?: SwAccess;
  funs?: ReadonlyArray<SwFun>;
  runtime?: boolean;
}): SwEnum {
  return {
    kind: "enum",
    name: opts.name,
    access: opts.access ?? "public",
    rawType: opts.rawType,
    conforms: opts.conforms ?? [],
    cases: opts.cases,
    funs: opts.funs ?? [],
    runtime: opts.runtime,
  };
}
