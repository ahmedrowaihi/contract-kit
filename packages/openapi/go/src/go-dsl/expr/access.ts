import type { GoExpr } from "./types.js";

/**
 * Bare identifier reference.
 *
 * @example
 * ```go
 * // goIdent("req") → req
 * ```
 */
export const goIdent = (name: string): GoExpr => ({ kind: "ident", name });

/**
 * Selector — `expr.name`. Used for both struct-field access and
 * package-qualified names (`http.NewRequest`).
 *
 * @example
 * ```go
 * // goSelector(goIdent("req"), "URL") → req.URL
 * // goSelector(goIdent("http"), "NewRequest") → http.NewRequest
 * ```
 */
export const goSelector = (on: GoExpr, name: string): GoExpr => ({
  kind: "selector",
  on,
  name,
});

/**
 * Index access — `expr[index]`.
 *
 * @example
 * ```go
 * // goIndex(goIdent("m"), goStr("k")) → m["k"]
 * ```
 */
export const goIndex = (on: GoExpr, index: GoExpr): GoExpr => ({
  kind: "index",
  on,
  index,
});
