export type SwPrimitive =
  | "String"
  | "Int"
  | "Int32"
  | "Int64"
  | "Double"
  | "Float"
  | "Bool"
  | "Data"
  | "Void"
  | "Any";

export type SwType =
  | { kind: "primitive"; name: SwPrimitive }
  | { kind: "array"; element: SwType }
  | { kind: "dictionary"; key: SwType; value: SwType }
  | { kind: "ref"; name: string }
  | { kind: "optional"; inner: SwType };
