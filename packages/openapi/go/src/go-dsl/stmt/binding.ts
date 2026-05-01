import type { GoExpr } from "../expr/types.js";
import type { GoType } from "../type/types.js";
import type { GoStmt } from "./types.js";

/**
 * Short variable declaration — `name := expr` (idiomatic Go inside
 * function bodies). Multi-name form supported for two-value returns.
 *
 * @example
 * ```go
 * // goShort(["resp", "err"], [goCall(...)])
 * //   → resp, err := callee(...)
 * ```
 */
export const goShort = (
  names: ReadonlyArray<string>,
  values: ReadonlyArray<GoExpr>,
): GoStmt => ({ kind: "shortDecl", names, values });

/**
 * `var name T = expr`. Use when the type can't be inferred or when
 * declaring a zero-value (omit `expr`).
 *
 * @example
 * ```go
 * // goVar("count", goInt) → var count int
 * // goVar("v", goInt, goIntLit(1)) → var v int = 1
 * ```
 */
export const goVar = (name: string, type?: GoType, expr?: GoExpr): GoStmt => ({
  kind: "var",
  name,
  type,
  expr,
});

/**
 * `const name [T] = expr`.
 */
export const goConst = (name: string, expr: GoExpr, type?: GoType): GoStmt => ({
  kind: "const",
  name,
  type,
  expr,
});

/**
 * Assignment to one or more existing l-values — `target = value`,
 * `a, b = c, d`.
 *
 * @example
 * ```go
 * // goAssign([goSelector(goIdent("req"), "URL")], [goIdent("u")])
 * //   → req.URL = u
 * ```
 */
export const goAssign = (
  targets: ReadonlyArray<GoExpr>,
  values: ReadonlyArray<GoExpr>,
): GoStmt => ({ kind: "assign", targets, values });

/** Bare expression statement (the value is discarded). */
export const goExprStmt = (expr: GoExpr): GoStmt => ({ kind: "expr", expr });

/** `defer expr` — runs `expr` when the surrounding func returns. */
export const goDefer = (expr: GoExpr): GoStmt => ({ kind: "defer", expr });

/** `go expr` — spawns `expr` as a goroutine. */
export const goGo = (expr: GoExpr): GoStmt => ({ kind: "go", expr });
