import type { SwType } from "../type/types.js";
import type { SwExpr } from "./types.js";

export const swTuple = (items: ReadonlyArray<SwExpr>): SwExpr => ({
  kind: "tuple",
  items,
});

export const swTypeRef = (type: SwType): SwExpr => ({ kind: "typeRef", type });
