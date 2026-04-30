import type { SwBinOpExpr, SwExpr } from "./types.js";

/**
 * Binary operator. Use the named helpers (`swEq`, `swNe`) where
 * possible; reach for this when you need `<`/`>`/`&&`/`||`.
 *
 * @example
 * ```swift
 * // swBinOp("<", swIntLit(1), swIntLit(2)) → 1 < 2
 * ```
 */
export const swBinOp = (
  op: SwBinOpExpr["op"],
  left: SwExpr,
  right: SwExpr,
): SwExpr => ({ kind: "binOp", op, left, right });

/**
 * `left == right`.
 *
 * @example
 * ```swift
 * // swEq(swIdent("status"), swIntLit(200)) → status == 200
 * ```
 */
export const swEq = (l: SwExpr, r: SwExpr) => swBinOp("==", l, r);

/**
 * `left != right`.
 *
 * @example
 * ```swift
 * // swNe(swIdent("name"), swStr("admin")) → name != "admin"
 * ```
 */
export const swNe = (l: SwExpr, r: SwExpr) => swBinOp("!=", l, r);
