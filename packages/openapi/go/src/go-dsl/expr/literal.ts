import type { GoExpr } from "./types.js";

/**
 * String literal. Default rendering uses double-quoted form with
 * backslash escapes; pass `raw: true` for `` `…` `` raw form (handy
 * for paths containing backslashes or regex literals).
 *
 * @example
 * ```go
 * // goStr("application/json") → "application/json"
 * // goStr("foo\\bar", true)   → `foo\bar`
 * ```
 */
export const goStr = (value: string, raw: boolean = false): GoExpr => ({
  kind: "str",
  value,
  raw,
});

/**
 * Integer literal.
 *
 * @example
 * ```go
 * // goIntLit(200) → 200
 * ```
 */
export const goIntLit = (value: number): GoExpr => ({ kind: "int", value });

/**
 * Float literal — always emits a decimal point (`1.0`, not `1`) to
 * distinguish from the int form.
 *
 * @example
 * ```go
 * // goFloatLit(1.5) → 1.5
 * ```
 */
export const goFloatLit = (value: number): GoExpr => ({
  kind: "float",
  value,
});

/**
 * Boolean literal.
 *
 * @example
 * ```go
 * // goBoolLit(true) → true
 * ```
 */
export const goBoolLit = (value: boolean): GoExpr => ({
  kind: "bool",
  value,
});

/**
 * `nil`.
 *
 * @example
 * ```go
 * // goNil → nil
 * ```
 */
export const goNil: GoExpr = { kind: "nil" };

/** `_` — used as the LHS to discard a return value. */
export const goUnderscore: GoExpr = { kind: "underscore" };

/** `iota` — only valid inside a `const ( ... )` block. */
export const goIota: GoExpr = { kind: "iota" };
