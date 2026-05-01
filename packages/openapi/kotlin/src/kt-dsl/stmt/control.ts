import type { KtExpr } from "../expr/types.js";
import type { KtType } from "../type/types.js";
import type { KtCatchClause, KtStmt, KtWhenCase } from "./types.js";

/**
 * `return` (with or without an expression).
 *
 * @example
 * ```kotlin
 * // ktReturn()                   → return
 * // ktReturn(ktIdent("data"))    → return data
 * ```
 */
export const ktReturn = (expr?: KtExpr): KtStmt => ({ kind: "return", expr });

/**
 * `throw expr`.
 *
 * @example
 * ```kotlin
 * // ktThrow(ktCall(ktIdent("ApiError.Decoding"), [ktArg(ktIdent("e"))]))
 * //   → throw ApiError.Decoding(e)
 * ```
 */
export const ktThrow = (expr: KtExpr): KtStmt => ({ kind: "throw", expr });

/**
 * `if (cond) { then } [else { else_ }]`.
 *
 * @example
 * ```kotlin
 * // ktIf(ktEq(ktIdent("status"), ktIntLit(200)),
 * //      [ktReturn(ktIdent("data"))])
 * //   → if (status == 200) { return data }
 * ```
 */
export const ktIf = (
  cond: KtExpr,
  then: ReadonlyArray<KtStmt>,
  else_?: ReadonlyArray<KtStmt>,
): KtStmt => ({ kind: "if", cond, then, else_ });

/**
 * `when (on) { … }` — multi-arm dispatch. Pass no `on` for the
 * boolean-arm form (`when { cond -> … }`).
 *
 * @example
 * ```kotlin
 * // ktWhen(ktIdent("location"), [
 * //   ktWhenCase([ktIdent("Header")], [ktExprStmt(…)]),
 * // ], [ktExprStmt(…)])
 * //   → when (location) { Header -> { … } else -> { … } }
 * ```
 */
export const ktWhen = (
  on: KtExpr | undefined,
  cases: ReadonlyArray<KtWhenCase>,
  default_?: ReadonlyArray<KtStmt>,
): KtStmt => ({ kind: "when", on, cases, default_ });

/**
 * One arm of a `when` — a list of patterns paired with a body. The
 * printer joins multiple patterns with `, ` and wraps the body in `{ }`
 * unless it's a single statement.
 */
export const ktWhenCase = (
  patterns: ReadonlyArray<KtExpr>,
  body: ReadonlyArray<KtStmt>,
): KtWhenCase => ({ patterns, body });

/**
 * `for (name in source) { body }`.
 *
 * @example
 * ```kotlin
 * // ktForIn("interceptor", ktIdent("interceptors"), [
 * //   ktAssign(ktIdent("req"), ktCall(ktIdent("interceptor"), [ktArg(ktIdent("req"))])),
 * // ])
 * //   → for (interceptor in interceptors) { req = interceptor(req) }
 * ```
 */
export const ktForIn = (
  name: string,
  source: KtExpr,
  body: ReadonlyArray<KtStmt>,
): KtStmt => ({ kind: "forIn", name, source, body });

/**
 * `try { body } catch (e: T) { … }`.
 *
 * @example
 * ```kotlin
 * // ktTryCatch([ktReturn(…)], [ktCatch("e", ktRef("Throwable"), [ktThrow(…)])])
 * //   → try { … } catch (e: Throwable) { … }
 * ```
 */
export const ktTryCatch = (
  body: ReadonlyArray<KtStmt>,
  catches: ReadonlyArray<KtCatchClause>,
): KtStmt => ({ kind: "tryCatch", body, catches });

/**
 * One `catch` clause for `ktTryCatch`.
 */
export const ktCatch = (
  name: string,
  type: KtType,
  body: ReadonlyArray<KtStmt>,
): KtCatchClause => ({ name, type, body });
