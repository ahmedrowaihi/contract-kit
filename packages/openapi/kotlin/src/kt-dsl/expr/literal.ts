import type { KtExpr } from "./types.js";

/**
 * String literal. The printer escapes embedded quotes / backslashes /
 * control bytes (`\r\n\t`) safely.
 *
 * @example
 * ```kotlin
 * // ktStr("application/json") → "application/json"
 * ```
 */
export const ktStr = (value: string): KtExpr => ({ kind: "str", value });

/**
 * Int literal.
 *
 * @example
 * ```kotlin
 * // ktIntLit(200) → 200
 * ```
 */
export const ktIntLit = (value: number): KtExpr => ({ kind: "int", value });

/**
 * Long literal — renders with the trailing `L` suffix.
 *
 * @example
 * ```kotlin
 * // ktLongLit(42) → 42L
 * ```
 */
export const ktLongLit = (value: number): KtExpr => ({ kind: "long", value });

/**
 * Double literal.
 *
 * @example
 * ```kotlin
 * // ktDoubleLit(1.5) → 1.5
 * ```
 */
export const ktDoubleLit = (value: number): KtExpr => ({
  kind: "double",
  value,
});

/**
 * Boolean literal.
 *
 * @example
 * ```kotlin
 * // ktBoolLit(true) → true
 * ```
 */
export const ktBoolLit = (value: boolean): KtExpr => ({ kind: "bool", value });

/**
 * `null`.
 *
 * @example
 * ```kotlin
 * // ktNull → null
 * ```
 */
export const ktNull: KtExpr = { kind: "null" };

/**
 * `_` — destructuring wildcard.
 */
export const ktUnderscore: KtExpr = { kind: "underscore" };

/**
 * `this`.
 *
 * @example
 * ```kotlin
 * // ktThis → this
 * ```
 */
export const ktThis: KtExpr = { kind: "this" };

/**
 * String template (interpolation). Accepts a mix of literal segments
 * and Kotlin expressions; the printer wraps each expression in
 * `${ … }` (or `$ident` when the expression is a bare identifier).
 *
 * @example
 * ```kotlin
 * // ktInterp(["Bearer ", ktIdent("token")]) → "Bearer $token"
 * // ktInterp(["url=", ktMember(ktIdent("req"), "url")]) → "url=${req.url}"
 * ```
 */
export const ktInterp = (parts: ReadonlyArray<string | KtExpr>): KtExpr => ({
  kind: "interp",
  parts,
});

/**
 * `listOf(items...)`.
 *
 * @example
 * ```kotlin
 * // ktListLit([ktStr("a"), ktStr("b")]) → listOf("a", "b")
 * ```
 */
export const ktListLit = (items: ReadonlyArray<KtExpr>): KtExpr => ({
  kind: "listLit",
  items,
});

/**
 * `mapOf(k to v, …)`.
 *
 * @example
 * ```kotlin
 * // ktMapLit([[ktStr("k"), ktIntLit(1)]]) → mapOf("k" to 1)
 * ```
 */
export const ktMapLit = (
  pairs: ReadonlyArray<readonly [KtExpr, KtExpr]>,
): KtExpr => ({ kind: "mapLit", pairs });
