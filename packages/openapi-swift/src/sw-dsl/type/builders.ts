import type { SwPrimitive, SwType } from "./types.js";

const prim = (name: SwPrimitive): SwType => ({ kind: "primitive", name });

export const swString = prim("String");
export const swInt = prim("Int");
export const swInt32 = prim("Int32");
export const swInt64 = prim("Int64");
export const swDouble = prim("Double");
export const swFloat = prim("Float");
export const swBool = prim("Bool");
export const swData = prim("Data");
export const swVoid = prim("Void");
export const swAny = prim("Any");

export const swOptional = (inner: SwType): SwType => ({
  kind: "optional",
  inner,
});
export const swArray = (element: SwType): SwType => ({
  kind: "array",
  element,
});
export const swDict = (key: SwType, value: SwType): SwType => ({
  kind: "dictionary",
  key,
  value,
});
export const swRef = (name: string): SwType => ({ kind: "ref", name });
