import type { GoType } from "../type/types.js";
import type { GoCompositeLit, GoExpr } from "./types.js";

/**
 * Type assertion — `expr.(T)`. Pass `commaOk: true` for the
 * comma-ok form `v, ok := expr.(T)` (only valid as the RHS of a
 * `let`/`assign` with two-name binding).
 *
 * @example
 * ```go
 * // goTypeAssert(goIdent("any"), goRef("*Foo")) → any.(*Foo)
 * ```
 */
export const goTypeAssert = (
  expr: GoExpr,
  type: GoType,
  commaOk: boolean = false,
): GoExpr => ({
  kind: "typeAssert",
  expr,
  type,
  commaOk: commaOk || undefined,
});

/**
 * Struct literal — `T{ field: value, ... }`. Pass `name: undefined`
 * on a field for positional form.
 *
 * @example
 * ```go
 * // goStructLit(goRef("Pet"), [{ name: "ID", value: goIntLit(1) }])
 * //   → Pet{ID: 1}
 * ```
 */
export const goStructLit = (
  type: GoType,
  fields: ReadonlyArray<{ name?: string; value: GoExpr }>,
): GoCompositeLit => ({ kind: "structLit", type, fields });

/**
 * Slice literal — `[]T{a, b, …}`.
 *
 * @example
 * ```go
 * // goSliceLit(goString, [goStr("a"), goStr("b")])
 * //   → []string{"a", "b"}
 * ```
 */
export const goSliceLit = (
  element: GoType,
  items: ReadonlyArray<GoExpr>,
): GoCompositeLit => ({ kind: "sliceLit", element, items });

/**
 * Map literal — `map[K]V{ k: v, ... }`.
 *
 * @example
 * ```go
 * // goMapLit(goString, goInt, [[goStr("a"), goIntLit(1)]])
 * //   → map[string]int{"a": 1}
 * ```
 */
export const goMapLit = (
  key: GoType,
  value: GoType,
  pairs: ReadonlyArray<readonly [GoExpr, GoExpr]>,
): GoCompositeLit => ({ kind: "mapLit", key, value, pairs });

/**
 * Type metadata reference — used as the first arg to e.g.
 * `json.Decode` (although Go uses pointer types for that, this is
 * here for parity with other DSLs and can be used in printf-style
 * `%T` contexts).
 */
export const goTypeRef = (type: GoType): GoExpr => ({ kind: "typeRef", type });
