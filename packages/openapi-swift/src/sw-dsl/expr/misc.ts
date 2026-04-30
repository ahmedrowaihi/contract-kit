import type { SwType } from "../type/types.js";
import type { SwExpr } from "./types.js";

/**
 * Tuple literal.
 *
 * @example
 * ```swift
 * // swTuple([swIdent("data"), swIdent("response")]) → (data, response)
 * ```
 */
export const swTuple = (items: ReadonlyArray<SwExpr>): SwExpr => ({
  kind: "tuple",
  items,
});

/**
 * Type metatype reference — `<Type>.self`. Use as the first arg to
 * `decoder.decode(_:from:)` and similar generic-type-erased APIs.
 *
 * @example
 * ```swift
 * // swTypeRef(swRef("User")) → User.self
 * ```
 */
export const swTypeRef = (type: SwType): SwExpr => ({ kind: "typeRef", type });

/**
 * Half-open range `low..<high` — common for HTTP status-code dispatch.
 *
 * @example
 * ```swift
 * // swRange(swIntLit(200), swIntLit(300)) → 200..<300
 * ```
 */
export const swRange = (low: SwExpr, high: SwExpr): SwExpr => ({
  kind: "range",
  halfOpen: true,
  low,
  high,
});

/**
 * Closed range `low...high`.
 *
 * @example
 * ```swift
 * // swClosedRange(swIntLit(1), swIntLit(10)) → 1...10
 * ```
 */
export const swClosedRange = (low: SwExpr, high: SwExpr): SwExpr => ({
  kind: "range",
  halfOpen: false,
  low,
  high,
});

/**
 * `expr as? Type` — runtime conditional cast, returns `Type?`.
 *
 * @example
 * ```swift
 * // swAsOpt(swIdent("response"), swRef("HTTPURLResponse"))
 * //   → response as? HTTPURLResponse
 * ```
 */
export const swAsOpt = (expr: SwExpr, type: SwType): SwExpr => ({
  kind: "as",
  expr,
  type,
  optional: true,
});

/**
 * `expr as Type` — type ascription / forced cast.
 *
 * @example
 * ```swift
 * // swAs(swIdent("any"), swRef("URL")) → any as URL
 * ```
 */
export const swAs = (expr: SwExpr, type: SwType): SwExpr => ({
  kind: "as",
  expr,
  type,
  optional: false,
});
