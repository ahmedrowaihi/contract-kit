import type { KtType } from "../type/types.js";
import type { KtExpr } from "./types.js";

/**
 * `expr as Type` — unconditional cast.
 *
 * @example
 * ```kotlin
 * // ktAs(ktIdent("any"), ktRef("HttpUrl"))
 * //   → any as HttpUrl
 * ```
 */
export const ktAs = (expr: KtExpr, type: KtType): KtExpr => ({
  kind: "cast",
  expr,
  type,
  safe: false,
});

/**
 * `expr as? Type` — safe cast, returns null if the cast fails.
 *
 * @example
 * ```kotlin
 * // ktAsSafe(ktIdent("response"), ktRef("HttpResponse"))
 * //   → response as? HttpResponse
 * ```
 */
export const ktAsSafe = (expr: KtExpr, type: KtType): KtExpr => ({
  kind: "cast",
  expr,
  type,
  safe: true,
});

/**
 * `low until high` — half-open range.
 *
 * @example
 * ```kotlin
 * // ktUntil(ktIntLit(200), ktIntLit(300)) → 200 until 300
 * ```
 */
export const ktUntil = (low: KtExpr, high: KtExpr): KtExpr => ({
  kind: "range",
  halfOpen: true,
  low,
  high,
});

/**
 * `low..high` — closed range.
 */
export const ktRange = (low: KtExpr, high: KtExpr): KtExpr => ({
  kind: "range",
  halfOpen: false,
  low,
  high,
});

/**
 * Type metaclass reference — `Type::class`.
 *
 * @example
 * ```kotlin
 * // ktClassRef(ktRef("User")) → User::class
 * ```
 */
export const ktClassRef = (type: KtType): KtExpr => ({ kind: "typeRef", type });
