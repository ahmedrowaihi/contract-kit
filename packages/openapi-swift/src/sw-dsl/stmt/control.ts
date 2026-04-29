import type { SwExpr } from "../expr/types.js";
import type { SwStmt } from "./types.js";

export const swReturn = (expr?: SwExpr): SwStmt => ({ kind: "return", expr });

export const swThrow = (expr: SwExpr): SwStmt => ({ kind: "throw", expr });

export const swIf = (
  cond: SwExpr,
  then: ReadonlyArray<SwStmt>,
  else_?: ReadonlyArray<SwStmt>,
): SwStmt => ({ kind: "if", cond, then, else_ });

export const swIfLet = (
  name: string,
  source: SwExpr,
  then: ReadonlyArray<SwStmt>,
  else_?: ReadonlyArray<SwStmt>,
): SwStmt => ({ kind: "ifLet", name, source, then, else_ });

export const swGuardLet = (
  name: string,
  source: SwExpr,
  else_: ReadonlyArray<SwStmt>,
): SwStmt => ({ kind: "guardLet", name, source, else_ });
