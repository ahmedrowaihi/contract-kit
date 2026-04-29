import type { SwExpr } from "./types.js";

export const swIdent = (name: string): SwExpr => ({ kind: "ident", name });

export const swMember = (on: SwExpr, name: string): SwExpr => ({
  kind: "member",
  on,
  name,
});

export const swOptChain = (on: SwExpr, name: string): SwExpr => ({
  kind: "optChain",
  on,
  name,
});

export const swSubscript = (on: SwExpr, index: SwExpr): SwExpr => ({
  kind: "subscript",
  on,
  index,
});

export const swForceUnwrap = (on: SwExpr): SwExpr => ({
  kind: "forceUnwrap",
  on,
});
