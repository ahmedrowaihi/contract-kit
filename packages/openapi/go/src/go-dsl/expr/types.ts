import type { GoType } from "../type/types.js";

export type GoExpr =
  | GoLiteralExpr
  | GoAccessExpr
  | GoCallExpr
  | GoFuncLitExpr
  | GoBinOpExpr
  | GoUnaryExpr
  | GoTypeAssertExpr
  | GoCompositeLit
  | { kind: "typeRef"; type: GoType };

export type GoLiteralExpr =
  | { kind: "str"; value: string; raw?: boolean }
  | { kind: "int"; value: number }
  | { kind: "float"; value: number }
  | { kind: "bool"; value: boolean }
  | { kind: "nil" }
  | { kind: "underscore" }
  | { kind: "iota" };

export type GoAccessExpr =
  | { kind: "ident"; name: string }
  | { kind: "selector"; on: GoExpr; name: string }
  | { kind: "index"; on: GoExpr; index: GoExpr };

export interface GoCallArg {
  expr: GoExpr;
  /** When true, render as `expr...` (variadic spread). */
  spread?: boolean;
}

export interface GoCallExpr {
  kind: "call";
  callee: GoExpr;
  args: ReadonlyArray<GoCallArg>;
  /** Generic type args, rendered as `[A, B]` between callee and args. */
  typeArgs?: ReadonlyArray<GoType>;
}

export interface GoFuncLitExpr {
  kind: "funcLit";
  params: ReadonlyArray<{ name: string; type: GoType }>;
  results: ReadonlyArray<{ name?: string; type: GoType }>;
  body: ReadonlyArray<import("../stmt/types.js").GoStmt>;
}

export interface GoBinOpExpr {
  kind: "binOp";
  op:
    | "=="
    | "!="
    | "<"
    | "<="
    | ">"
    | ">="
    | "&&"
    | "||"
    | "+"
    | "-"
    | "*"
    | "/";
  left: GoExpr;
  right: GoExpr;
}

export interface GoUnaryExpr {
  kind: "unary";
  op: "&" | "*" | "!" | "-";
  operand: GoExpr;
}

export interface GoTypeAssertExpr {
  kind: "typeAssert";
  expr: GoExpr;
  type: GoType;
  /** When true, render the comma-ok form `v, ok := expr.(T)`. */
  commaOk?: boolean;
}

/**
 * Struct / slice / map composite literal — `T{ field: v, ... }`,
 * `[]T{ a, b }`, `map[K]V{ k: v }`.
 */
export type GoCompositeLit =
  | {
      kind: "structLit";
      type: GoType;
      fields: ReadonlyArray<{ name?: string; value: GoExpr }>;
    }
  | { kind: "sliceLit"; element: GoType; items: ReadonlyArray<GoExpr> }
  | {
      kind: "mapLit";
      key: GoType;
      value: GoType;
      pairs: ReadonlyArray<readonly [GoExpr, GoExpr]>;
    };
