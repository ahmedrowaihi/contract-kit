import type { KtExpr } from "../expr/types.js";
import type { KtType } from "../type/types.js";

export type KtStmt =
  | KtBindingStmt
  | KtControlStmt
  | { kind: "assign"; target: KtExpr; value: KtExpr }
  | { kind: "expr"; expr: KtExpr }
  | { kind: "returnExpr"; expr: KtExpr }
  | {
      kind: "tryCatch";
      body: ReadonlyArray<KtStmt>;
      catches: ReadonlyArray<KtCatchClause>;
    };

export interface KtCatchClause {
  /** The exception variable name; defaults to `e`. */
  name: string;
  /** Exception type (e.g. `Throwable`, `IOException`). */
  type: KtType;
  body: ReadonlyArray<KtStmt>;
}

export type KtBindingStmt =
  | { kind: "val"; name: string; expr: KtExpr; type?: KtType }
  | { kind: "var"; name: string; expr: KtExpr; type?: KtType };

export type KtControlStmt =
  | { kind: "return"; expr?: KtExpr }
  | { kind: "throw"; expr: KtExpr }
  | {
      kind: "if";
      cond: KtExpr;
      then: ReadonlyArray<KtStmt>;
      else_?: ReadonlyArray<KtStmt>;
    }
  | {
      kind: "when";
      on?: KtExpr;
      cases: ReadonlyArray<KtWhenCase>;
      default_?: ReadonlyArray<KtStmt>;
    }
  | {
      kind: "forIn";
      name: string;
      source: KtExpr;
      body: ReadonlyArray<KtStmt>;
    };

export interface KtWhenCase {
  patterns: ReadonlyArray<KtExpr>;
  body: ReadonlyArray<KtStmt>;
}
