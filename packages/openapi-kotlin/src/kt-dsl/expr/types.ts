import type { KtType } from "../type/types.js";

export type KtExpr =
  | KtLiteralExpr
  | KtAccessExpr
  | KtCallExpr
  | KtLambdaExpr
  | KtBinOpExpr
  | KtRangeExpr
  | KtCastExpr
  | { kind: "this" }
  | { kind: "typeRef"; type: KtType };

export interface KtRangeExpr {
  kind: "range";
  /** `until` (`a until b`) is half-open; `..` is closed. */
  halfOpen: boolean;
  low: KtExpr;
  high: KtExpr;
}

export interface KtCastExpr {
  kind: "cast";
  expr: KtExpr;
  type: KtType;
  /** `as?` (safe) when true, `as` when false. */
  safe: boolean;
}

export type KtLiteralExpr =
  | { kind: "str"; value: string }
  | { kind: "int"; value: number }
  | { kind: "long"; value: number }
  | { kind: "double"; value: number }
  | { kind: "bool"; value: boolean }
  | { kind: "null" }
  | { kind: "underscore" }
  | { kind: "interp"; parts: ReadonlyArray<string | KtExpr> }
  | { kind: "listLit"; items: ReadonlyArray<KtExpr> }
  | {
      kind: "mapLit";
      pairs: ReadonlyArray<readonly [KtExpr, KtExpr]>;
    };

export type KtAccessExpr =
  | { kind: "ident"; name: string }
  | { kind: "member"; on: KtExpr; name: string }
  | { kind: "safeMember"; on: KtExpr; name: string }
  | { kind: "index"; on: KtExpr; index: KtExpr }
  | { kind: "notNull"; on: KtExpr };

export interface KtCallArg {
  label?: string;
  expr: KtExpr;
}

export interface KtCallExpr {
  kind: "call";
  callee: KtExpr;
  args: ReadonlyArray<KtCallArg>;
  trailingLambda?: KtLambdaExpr;
  /** Generic type args, rendered as `<A, B>` after the callee. */
  typeArgs?: ReadonlyArray<KtType>;
}

export interface KtLambdaExpr {
  kind: "lambda";
  params: ReadonlyArray<string>;
  body: ReadonlyArray<import("../stmt/types.js").KtStmt>;
}

export interface KtBinOpExpr {
  kind: "binOp";
  op: "==" | "!=" | "<" | "<=" | ">" | ">=" | "&&" | "||" | "?:" | "+";
  left: KtExpr;
  right: KtExpr;
}
