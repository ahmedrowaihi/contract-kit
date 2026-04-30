import type { KtStmt } from "../stmt/types.js";
import type { KtType } from "../type/types.js";
import type { KtCallArg, KtExpr, KtLambdaExpr } from "./types.js";

/**
 * Single call argument. Pass `label` for a named argument
 * (`label = expr`).
 *
 * @example
 * ```kotlin
 * // ktArg(ktIdent("data"), "from") → from = data
 * // ktArg(ktIdent("body"))         → body
 * ```
 */
export const ktArg = (expr: KtExpr, label?: string): KtCallArg => ({
  expr,
  label,
});

/**
 * Function-or-method call expression.
 *
 * @example
 * ```kotlin
 * // ktCall(ktIdent("Request.Builder"), [])
 * //   → Request.Builder()
 * // ktCall(ktMember(ktIdent("client"), "newCall"), [ktArg(ktIdent("req"))])
 * //   → client.newCall(req)
 * ```
 */
export const ktCall = (
  callee: KtExpr,
  args: ReadonlyArray<KtCallArg> = [],
  trailingLambda?: KtLambdaExpr,
  typeArgs?: ReadonlyArray<KtType>,
): KtExpr => ({ kind: "call", callee, args, trailingLambda, typeArgs });

/**
 * Lambda literal. Pass an empty `params` array for an `it`-implicit
 * lambda; the printer will omit the `params ->` prefix.
 *
 * @example
 * ```kotlin
 * // ktLambda(["item"], [ktReturnExpr(ktMember(ktIdent("item"), "name"))])
 * //   → { item -> item.name }
 * ```
 */
export const ktLambda = (
  params: ReadonlyArray<string>,
  body: ReadonlyArray<KtStmt>,
): KtLambdaExpr => ({ kind: "lambda", params, body });
