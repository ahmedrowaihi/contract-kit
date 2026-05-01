import type { GoExpr } from "../expr/types.js";
import type { GoType } from "../type/types.js";
import type { GoStmt, GoSwitchCase, GoTypeSwitchCase } from "./types.js";

/**
 * `return [values...]`. Pass `[]` for a bare `return`.
 *
 * @example
 * ```go
 * // goReturn([])               → return
 * // goReturn([goIdent("v")])   → return v
 * // goReturn([goIdent("v"), goNil]) → return v, nil
 * ```
 */
export const goReturn = (values: ReadonlyArray<GoExpr>): GoStmt => ({
  kind: "return",
  values,
});

/**
 * `if [init;] cond { then } [else { else_ }]`.
 *
 * @example
 * ```go
 * // goIf(goEq(goIdent("err"), goNil), [goReturn([goIdent("v")])])
 * //   → if err == nil { return v }
 * // goIf(goNe(goIdent("err"), goNil), [...], { init: goShort(["v","err"], [...]) })
 * //   → if v, err := call(); err != nil { ... }
 * ```
 */
export const goIf = (
  cond: GoExpr,
  then: ReadonlyArray<GoStmt>,
  opts: {
    init?: GoStmt;
    else_?: ReadonlyArray<GoStmt>;
  } = {},
): GoStmt => ({ kind: "if", cond, then, init: opts.init, else_: opts.else_ });

/**
 * Three-clause `for` loop — `for [init]; [cond]; [post] { body }`.
 *
 * @example
 * ```go
 * // goFor({ init: goShort(["i"],[goIntLit(0)]),
 * //         cond: goBinOp("<", goIdent("i"), goIntLit(10)),
 * //         post: goAssign([goIdent("i")], [goBinOp("+", goIdent("i"), goIntLit(1))]) },
 * //       [...])
 * //   → for i := 0; i < 10; i = i + 1 { ... }
 * ```
 */
export const goFor = (
  opts: { init?: GoStmt; cond?: GoExpr; post?: GoStmt },
  body: ReadonlyArray<GoStmt>,
): GoStmt => ({ kind: "for", body, ...opts });

/**
 * `for k, v := range source { body }`. Either `key` or `value` may be
 * omitted. `assign: true` switches to `=` form (for pre-declared
 * variables); default is `:=` short-declaration.
 *
 * @example
 * ```go
 * // goForRange({ key: "k", value: "v" }, goIdent("m"), [...])
 * //   → for k, v := range m { ... }
 * ```
 */
export const goForRange = (
  vars: { key?: string; value?: string; assign?: boolean },
  source: GoExpr,
  body: ReadonlyArray<GoStmt>,
): GoStmt => ({ kind: "forRange", source, body, ...vars });

/**
 * `switch [tag] { case ... { body } [default { body }] }`.
 *
 * @example
 * ```go
 * // goSwitch(goSelector(goIdent("resp"), "StatusCode"),
 * //   [goCase([goIntLit(200)], [...])],
 * //   [goReturn([...])])
 * //   → switch resp.StatusCode {
 * //       case 200: ...
 * //       default: return ...
 * //     }
 * ```
 */
export const goSwitch = (
  tag: GoExpr | undefined,
  cases: ReadonlyArray<GoSwitchCase>,
  default_?: ReadonlyArray<GoStmt>,
): GoStmt => ({ kind: "switch", tag, cases, default_ });

/** One arm of a `switch` — patterns and a body. */
export const goCase = (
  patterns: ReadonlyArray<GoExpr>,
  body: ReadonlyArray<GoStmt>,
): GoSwitchCase => ({ patterns, body });

/**
 * `switch [bind := ]expr.(type) { case T: ... }` — Go's type switch
 * for sum-type dispatch.
 *
 * @example
 * ```go
 * // goTypeSwitch("v", goIdent("any"),
 * //   [goTypeCase([goRef("*Foo")], [...])],
 * //   [goReturn([...])])
 * //   → switch v := any.(type) {
 * //       case *Foo: ...
 * //       default: ...
 * //     }
 * ```
 */
export const goTypeSwitch = (
  bind: string | undefined,
  expr: GoExpr,
  cases: ReadonlyArray<GoTypeSwitchCase>,
  default_?: ReadonlyArray<GoStmt>,
): GoStmt => ({ kind: "typeSwitch", bind, expr, cases, default_ });

/** One arm of a type-switch. */
export const goTypeCase = (
  types: ReadonlyArray<GoType>,
  body: ReadonlyArray<GoStmt>,
): GoTypeSwitchCase => ({ types, body });

export const goBreak: GoStmt = { kind: "break" };
export const goContinue: GoStmt = { kind: "continue" };
