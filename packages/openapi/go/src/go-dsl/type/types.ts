export type GoPrimitive =
  | "string"
  | "int"
  | "int32"
  | "int64"
  | "float32"
  | "float64"
  | "bool"
  | "byte"
  | "rune"
  | "any"
  | "error"
  | "context.Context";

export type GoType =
  | { kind: "primitive"; name: GoPrimitive }
  | { kind: "slice"; element: GoType }
  | { kind: "map"; key: GoType; value: GoType }
  | { kind: "ptr"; inner: GoType }
  | { kind: "ref"; name: string; typeParams?: ReadonlyArray<GoType> }
  | {
      kind: "func";
      params: ReadonlyArray<{ name?: string; type: GoType }>;
      results: ReadonlyArray<GoType>;
    }
  | {
      kind: "interface";
      methods: ReadonlyArray<{ name: string; signature: GoType }>;
    };
