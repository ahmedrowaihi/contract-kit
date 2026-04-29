import type { SwExpr } from "../expr/types.js";
import type { SwType } from "../type/types.js";

/** Left-hand side of `let`: either a single name or a tuple destructure. */
export type SwLetBinding =
  | string
  | { kind: "tuple"; names: ReadonlyArray<string | "_"> };

export type SwStmt =
  | SwBindingStmt
  | SwControlStmt
  | { kind: "assign"; target: SwExpr; value: SwExpr }
  | { kind: "expr"; expr: SwExpr };

export type SwBindingStmt =
  | { kind: "let"; binding: SwLetBinding; expr: SwExpr; type?: SwType }
  | { kind: "var"; name: string; expr: SwExpr; type?: SwType };

export type SwControlStmt =
  | { kind: "return"; expr?: SwExpr }
  | { kind: "throw"; expr: SwExpr }
  | {
      kind: "if";
      cond: SwExpr;
      then: ReadonlyArray<SwStmt>;
      else_?: ReadonlyArray<SwStmt>;
    }
  | {
      kind: "ifLet";
      name: string;
      source: SwExpr;
      then: ReadonlyArray<SwStmt>;
      else_?: ReadonlyArray<SwStmt>;
    }
  | {
      kind: "guardLet";
      name: string;
      source: SwExpr;
      else_: ReadonlyArray<SwStmt>;
    };
