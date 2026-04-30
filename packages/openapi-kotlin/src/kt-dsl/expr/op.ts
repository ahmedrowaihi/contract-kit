import type { KtBinOpExpr, KtExpr } from "./types.js";

/**
 * Binary operator. Use the named helpers (`ktEq`, `ktNe`, `ktElvis`)
 * where possible.
 */
export const ktBinOp = (
  op: KtBinOpExpr["op"],
  left: KtExpr,
  right: KtExpr,
): KtExpr => ({ kind: "binOp", op, left, right });

/**
 * `left == right` (Kotlin structural equality).
 */
export const ktEq = (l: KtExpr, r: KtExpr) => ktBinOp("==", l, r);

/**
 * `left != right`.
 */
export const ktNe = (l: KtExpr, r: KtExpr) => ktBinOp("!=", l, r);

/**
 * Elvis operator — `left ?: right`.
 *
 * @example
 * ```kotlin
 * // ktElvis(ktSafeMember(ktIdent("user"), "name"), ktStr("anonymous"))
 * //   → user?.name ?: "anonymous"
 * ```
 */
export const ktElvis = (l: KtExpr, r: KtExpr) => ktBinOp("?:", l, r);
