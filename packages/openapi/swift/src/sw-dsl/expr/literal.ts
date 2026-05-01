import type { SwType } from "../type/types.js";
import type { SwExpr } from "./types.js";

/**
 * String literal. The printer escapes embedded quotes / backslashes /
 * control bytes (`\r\n\t`) safely.
 *
 * @example
 * ```swift
 * // swStr("application/json") → "application/json"
 * ```
 */
export const swStr = (value: string): SwExpr => ({ kind: "str", value });

/**
 * Integer literal.
 *
 * @example
 * ```swift
 * // swIntLit(200) → 200
 * ```
 */
export const swIntLit = (value: number): SwExpr => ({ kind: "int", value });

/**
 * Boolean literal.
 *
 * @example
 * ```swift
 * // swBoolLit(true) → true
 * ```
 */
export const swBoolLit = (value: boolean): SwExpr => ({ kind: "bool", value });

/**
 * `nil`.
 *
 * @example
 * ```swift
 * // swNil → nil
 * ```
 */
export const swNil: SwExpr = { kind: "nil" };

/**
 * `_` (wildcard) — used as the LHS in `_ = expr` to discard a value.
 *
 * @example
 * ```swift
 * // swAssign(swUnderscore, …) → _ = …
 * ```
 */
export const swUnderscore: SwExpr = { kind: "underscore" };

/**
 * String interpolation. Accepts a mix of literal segments and Swift
 * expressions; the printer wraps each expression in `\( … )`.
 *
 * @example
 * ```swift
 * // swInterp(["Bearer ", swIdent("token")]) → "Bearer \(token)"
 * ```
 */
export const swInterp = (parts: ReadonlyArray<string | SwExpr>): SwExpr => ({
  kind: "interp",
  parts,
});

/**
 * Array literal. Pass `elementType` to render an explicit empty array
 * with type annotation when there are no items.
 *
 * @example
 * ```swift
 * // swArrayLit([swStr("a"), swStr("b")]) → ["a", "b"]
 * // swArrayLit([], swString)              → [String]()
 * ```
 */
export const swArrayLit = (
  items: ReadonlyArray<SwExpr>,
  elementType?: SwType,
): SwExpr => ({ kind: "arrayLit", items, elementType });

/**
 * Dictionary literal. Pass `keyType`/`valueType` for an empty
 * dictionary that needs an explicit type.
 *
 * @example
 * ```swift
 * // swDictLit([[swStr("k"), swIntLit(1)]]) → ["k": 1]
 * // swDictLit([], swString, swInt)          → [String: Int]()
 * ```
 */
export const swDictLit = (
  pairs: ReadonlyArray<readonly [SwExpr, SwExpr]>,
  keyType?: SwType,
  valueType?: SwType,
): SwExpr => ({ kind: "dictLit", pairs, keyType, valueType });
