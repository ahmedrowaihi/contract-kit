import type { SwType } from "../type/types.js";
import type { SwExpr } from "./types.js";

export const swStr = (value: string): SwExpr => ({ kind: "str", value });
export const swIntLit = (value: number): SwExpr => ({ kind: "int", value });
export const swBoolLit = (value: boolean): SwExpr => ({ kind: "bool", value });
export const swNil: SwExpr = { kind: "nil" };
export const swUnderscore: SwExpr = { kind: "underscore" };

export const swInterp = (parts: ReadonlyArray<string | SwExpr>): SwExpr => ({
  kind: "interp",
  parts,
});

export const swArrayLit = (
  items: ReadonlyArray<SwExpr>,
  elementType?: SwType,
): SwExpr => ({ kind: "arrayLit", items, elementType });

export const swDictLit = (
  pairs: ReadonlyArray<readonly [SwExpr, SwExpr]>,
  keyType?: SwType,
  valueType?: SwType,
): SwExpr => ({ kind: "dictLit", pairs, keyType, valueType });
