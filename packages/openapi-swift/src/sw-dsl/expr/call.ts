import type { SwStmt } from "../stmt/types.js";
import type { SwCallArg, SwClosureExpr, SwExpr } from "./types.js";

export const swArg = (expr: SwExpr, label?: string): SwCallArg => ({
  expr,
  label,
});

export const swCall = (
  callee: SwExpr,
  args: ReadonlyArray<SwCallArg> = [],
  trailingClosure?: SwClosureExpr,
): SwExpr => ({ kind: "call", callee, args, trailingClosure });

export const swClosure = (
  params: ReadonlyArray<string>,
  body: ReadonlyArray<SwStmt>,
): SwClosureExpr => ({ kind: "closure", params, body });
