import type { GoExpr } from "../expr/types.js";
import type { GoType } from "../type/types.js";

export type GoStmt =
  | GoBindingStmt
  | GoControlStmt
  | {
      kind: "assign";
      targets: ReadonlyArray<GoExpr>;
      values: ReadonlyArray<GoExpr>;
    }
  | { kind: "expr"; expr: GoExpr }
  | { kind: "defer"; expr: GoExpr }
  | { kind: "go"; expr: GoExpr };

/**
 * `var name [T] = expr` or `name := expr`. `:=` (short decl) is the
 * Go idiom inside function bodies; we always emit short-decl form
 * unless the caller specifies a type.
 */
export type GoBindingStmt =
  | {
      kind: "shortDecl";
      names: ReadonlyArray<string>;
      values: ReadonlyArray<GoExpr>;
    }
  | { kind: "var"; name: string; type?: GoType; expr?: GoExpr }
  | { kind: "const"; name: string; type?: GoType; expr: GoExpr };

export type GoControlStmt =
  | { kind: "return"; values: ReadonlyArray<GoExpr> }
  | {
      kind: "if";
      /** Optional init — `if init; cond { ... }`. */
      init?: GoStmt;
      cond: GoExpr;
      then: ReadonlyArray<GoStmt>;
      else_?: ReadonlyArray<GoStmt> | { kind: "ifElse"; stmt: GoControlStmt };
    }
  | {
      kind: "for";
      /** Optional init / cond / post — Go's three-clause for. */
      init?: GoStmt;
      cond?: GoExpr;
      post?: GoStmt;
      body: ReadonlyArray<GoStmt>;
    }
  | {
      kind: "forRange";
      key?: string;
      value?: string;
      /** When true, render `key, value := range expr` (assignment form). */
      assign?: boolean;
      source: GoExpr;
      body: ReadonlyArray<GoStmt>;
    }
  | {
      kind: "switch";
      /** `switch tag { ... }` — tag may be omitted for `switch { ... }`. */
      tag?: GoExpr;
      cases: ReadonlyArray<GoSwitchCase>;
      default_?: ReadonlyArray<GoStmt>;
    }
  | {
      kind: "typeSwitch";
      /** `bind := expr.(type)` — `bind` is optional. */
      bind?: string;
      expr: GoExpr;
      cases: ReadonlyArray<GoTypeSwitchCase>;
      default_?: ReadonlyArray<GoStmt>;
    }
  | { kind: "break" }
  | { kind: "continue" };

export interface GoSwitchCase {
  patterns: ReadonlyArray<GoExpr>;
  body: ReadonlyArray<GoStmt>;
}

export interface GoTypeSwitchCase {
  /** Each pattern is a type — `case *Foo:`. */
  types: ReadonlyArray<GoType>;
  body: ReadonlyArray<GoStmt>;
}
