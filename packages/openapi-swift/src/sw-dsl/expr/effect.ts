import type { SwExpr } from "./types.js";

export const swTry = (expr: SwExpr): SwExpr => ({
  kind: "try",
  expr,
  awaited: false,
});

export const swTryAwait = (expr: SwExpr): SwExpr => ({
  kind: "try",
  expr,
  awaited: true,
});
