import type { SwBinOpExpr, SwExpr } from "./types.js";

export const swBinOp = (
  op: SwBinOpExpr["op"],
  left: SwExpr,
  right: SwExpr,
): SwExpr => ({ kind: "binOp", op, left, right });

export const swEq = (l: SwExpr, r: SwExpr) => swBinOp("==", l, r);
export const swNe = (l: SwExpr, r: SwExpr) => swBinOp("!=", l, r);
