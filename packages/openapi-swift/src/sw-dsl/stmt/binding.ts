import type { SwExpr } from "../expr/types.js";
import type { SwType } from "../type/types.js";
import type { SwLetBinding, SwStmt } from "./types.js";

export const swLet = (
  binding: SwLetBinding,
  expr: SwExpr,
  type?: SwType,
): SwStmt => ({ kind: "let", binding, expr, type });

export const swVar = (name: string, expr: SwExpr, type?: SwType): SwStmt => ({
  kind: "var",
  name,
  expr,
  type,
});

export const swAssign = (target: SwExpr, value: SwExpr): SwStmt => ({
  kind: "assign",
  target,
  value,
});

export const swExprStmt = (expr: SwExpr): SwStmt => ({ kind: "expr", expr });

export const swTupleBinding = (
  names: ReadonlyArray<string | "_">,
): SwLetBinding => ({ kind: "tuple", names });
