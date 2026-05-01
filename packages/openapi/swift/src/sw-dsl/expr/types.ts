import type { SwType } from "../type/types.js";

export type SwExpr =
  | SwLiteralExpr
  | SwAccessExpr
  | SwCallExpr
  | SwClosureExpr
  | SwEffectExpr
  | SwBinOpExpr
  | SwRangeExpr
  | SwAsExpr
  | { kind: "tuple"; items: ReadonlyArray<SwExpr> }
  | { kind: "typeRef"; type: SwType };

export interface SwRangeExpr {
  kind: "range";
  halfOpen: boolean;
  low: SwExpr;
  high: SwExpr;
}

export interface SwAsExpr {
  kind: "as";
  expr: SwExpr;
  type: SwType;
  optional: boolean;
}

export type SwLiteralExpr =
  | { kind: "str"; value: string }
  | { kind: "int"; value: number }
  | { kind: "bool"; value: boolean }
  | { kind: "nil" }
  | { kind: "underscore" }
  | { kind: "interp"; parts: ReadonlyArray<string | SwExpr> }
  | { kind: "arrayLit"; items: ReadonlyArray<SwExpr>; elementType?: SwType }
  | {
      kind: "dictLit";
      pairs: ReadonlyArray<readonly [SwExpr, SwExpr]>;
      keyType?: SwType;
      valueType?: SwType;
    };

export type SwAccessExpr =
  | { kind: "ident"; name: string }
  | { kind: "dotCase"; name: string }
  | { kind: "enumPattern"; case: string; bindings: ReadonlyArray<string> }
  | { kind: "member"; on: SwExpr; name: string }
  | { kind: "optChain"; on: SwExpr; name: string }
  | { kind: "subscript"; on: SwExpr; index: SwExpr }
  | { kind: "forceUnwrap"; on: SwExpr };

export interface SwCallArg {
  label?: string;
  expr: SwExpr;
}

export interface SwCallExpr {
  kind: "call";
  callee: SwExpr;
  args: ReadonlyArray<SwCallArg>;
  trailingClosure?: SwClosureExpr;
}

export interface SwClosureExpr {
  kind: "closure";
  params: ReadonlyArray<string>;
  body: ReadonlyArray<import("../stmt/types.js").SwStmt>;
}

export type SwEffectExpr = { kind: "try"; expr: SwExpr; awaited: boolean };

export interface SwBinOpExpr {
  kind: "binOp";
  op: "==" | "!=" | "<" | "<=" | ">" | ">=" | "&&" | "||" | "??";
  left: SwExpr;
  right: SwExpr;
}
