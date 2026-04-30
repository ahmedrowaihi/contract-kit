import type { KtExpr } from "../expr/types.js";
import type { KtType } from "../type/types.js";
import type { KtStmt } from "./types.js";

/**
 * Immutable binding (`val`).
 *
 * @example
 * ```kotlin
 * // ktVal("status", ktIntLit(200))
 * //   → val status = 200
 * ```
 */
export const ktVal = (name: string, expr: KtExpr, type?: KtType): KtStmt => ({
  kind: "val",
  name,
  expr,
  type,
});

/**
 * Mutable binding (`var`).
 *
 * @example
 * ```kotlin
 * // ktVar("builder", ktCall(ktIdent("Request.Builder")))
 * //   → var builder = Request.Builder()
 * ```
 */
export const ktVar = (name: string, expr: KtExpr, type?: KtType): KtStmt => ({
  kind: "var",
  name,
  expr,
  type,
});

/**
 * Assignment to an existing l-value.
 *
 * @example
 * ```kotlin
 * // ktAssign(ktMember(ktIdent("req"), "method"), ktStr("GET"))
 * //   → req.method = "GET"
 * ```
 */
export const ktAssign = (target: KtExpr, value: KtExpr): KtStmt => ({
  kind: "assign",
  target,
  value,
});

/**
 * Bare expression statement (the value is discarded).
 *
 * @example
 * ```kotlin
 * // ktExprStmt(ktCall(ktMember(ktIdent("req"), "build"), []))
 * //   → req.build()
 * ```
 */
export const ktExprStmt = (expr: KtExpr): KtStmt => ({ kind: "expr", expr });

/**
 * Single-expression body marker — e.g. for property getters or
 * single-expression functions. The printer renders this as `= expr`
 * instead of a braced block when it's the only statement in a body.
 *
 * @example
 * ```kotlin
 * // ktReturnExpr(ktMember(ktIdent("foo"), "bar"))
 * //   → = foo.bar
 * ```
 */
export const ktReturnExpr = (expr: KtExpr): KtStmt => ({
  kind: "returnExpr",
  expr,
});
