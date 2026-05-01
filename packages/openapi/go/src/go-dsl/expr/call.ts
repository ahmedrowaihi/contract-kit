import type { GoStmt } from "../stmt/types.js";
import type { GoType } from "../type/types.js";
import type { GoCallArg, GoExpr, GoFuncLitExpr } from "./types.js";

/**
 * Single call argument. Pass `spread: true` for variadic (`args...`).
 *
 * @example
 * ```go
 * // goArg(goIdent("body"))                → body
 * // goArg(goIdent("rest"), true)          → rest...
 * ```
 */
export const goArg = (expr: GoExpr, spread: boolean = false): GoCallArg => ({
  expr,
  spread: spread || undefined,
});

/**
 * Function-or-method call expression. Generic type-args render as
 * `[A, B]` between callee and args (Go 1.18+).
 *
 * @example
 * ```go
 * // goCall(goSelector(goIdent("http"), "NewRequest"),
 * //        [goArg(goStr("GET")), goArg(goIdent("url")), goArg(goNil)])
 * //   → http.NewRequest("GET", url, nil)
 * // goCall(goIdent("Execute"), [goArg(goIdent("req"))], [goRef("Pet")])
 * //   → Execute[Pet](req)
 * ```
 */
export const goCall = (
  callee: GoExpr,
  args: ReadonlyArray<GoCallArg> = [],
  typeArgs?: ReadonlyArray<GoType>,
): GoExpr => ({ kind: "call", callee, args, typeArgs });

/**
 * Function literal — `func(params) (results) { body }`. Used for
 * inline closures (e.g. inside `go func() { … }()` or as a callback).
 *
 * @example
 * ```go
 * // goFuncLit([{ name: "req", type: goRef("*http.Request") }],
 * //           [{ type: goRef("*http.Request") }, { type: goError }],
 * //           [goReturn([...])])
 * //   → func(req *http.Request) (*http.Request, error) { … }
 * ```
 */
export const goFuncLit = (
  params: ReadonlyArray<{ name: string; type: GoType }>,
  results: ReadonlyArray<{ name?: string; type: GoType }>,
  body: ReadonlyArray<GoStmt>,
): GoFuncLitExpr => ({ kind: "funcLit", params, results, body });
