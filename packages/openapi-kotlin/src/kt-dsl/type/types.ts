export type KtPrimitive =
  | "String"
  | "Int"
  | "Long"
  | "Short"
  | "Byte"
  | "Double"
  | "Float"
  | "Boolean"
  | "Unit"
  | "Any"
  | "Nothing"
  | "ByteArray";

export type KtType =
  | { kind: "primitive"; name: KtPrimitive }
  | { kind: "list"; element: KtType }
  | { kind: "map"; key: KtType; value: KtType }
  | { kind: "ref"; name: string; args?: ReadonlyArray<KtType> }
  | { kind: "nullable"; inner: KtType }
  | {
      kind: "func";
      params: ReadonlyArray<KtType>;
      returnType: KtType;
      suspend: boolean;
    };
