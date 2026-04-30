import type { GoBinOpExpr, GoExpr, GoUnaryExpr } from "./types.js";

/**
 * Binary operator. Use the named helpers (`goEq`, `goNe`) when applicable.
 *
 * @example
 * ```go
 * // goBinOp("<", goIntLit(1), goIntLit(2)) → 1 < 2
 * ```
 */
export const goBinOp = (
  op: GoBinOpExpr["op"],
  left: GoExpr,
  right: GoExpr,
): GoExpr => ({ kind: "binOp", op, left, right });

/** `left == right`. */
export const goEq = (l: GoExpr, r: GoExpr) => goBinOp("==", l, r);

/** `left != right`. */
export const goNe = (l: GoExpr, r: GoExpr) => goBinOp("!=", l, r);

/**
 * Unary operator — `&x`, `*x`, `!x`, `-x`.
 *
 * @example
 * ```go
 * // goAddr(goIdent("x"))    → &x
 * // goDeref(goIdent("p"))   → *p
 * // goNot(goIdent("ok"))    → !ok
 * ```
 */
export const goUnary = (op: GoUnaryExpr["op"], operand: GoExpr): GoExpr => ({
  kind: "unary",
  op,
  operand,
});

export const goAddr = (operand: GoExpr): GoExpr => goUnary("&", operand);
export const goDeref = (operand: GoExpr): GoExpr => goUnary("*", operand);
export const goNot = (operand: GoExpr): GoExpr => goUnary("!", operand);
