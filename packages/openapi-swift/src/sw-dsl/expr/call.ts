import type { SwStmt } from "../stmt/types.js";
import type { SwCallArg, SwClosureExpr, SwExpr } from "./types.js";

/**
 * Single call argument. Pass `label` for an external label.
 *
 * @example
 * ```swift
 * // swArg(swIdent("data"), "from") → from: data
 * // swArg(swIdent("body"))         → body
 * ```
 */
export const swArg = (expr: SwExpr, label?: string): SwCallArg => ({
  expr,
  label,
});

/**
 * Function-or-method call expression.
 *
 * @example
 * ```swift
 * // swCall(swIdent("URLRequest"), [swArg(swIdent("url"), "url")])
 * //   → URLRequest(url: url)
 * ```
 */
export const swCall = (
  callee: SwExpr,
  args: ReadonlyArray<SwCallArg> = [],
  trailingClosure?: SwClosureExpr,
): SwExpr => ({ kind: "call", callee, args, trailingClosure });

/**
 * Closure literal. Pass an empty `params` array for a closure with
 * no `<params> in` line. A single `return expr` body is collapsed by
 * the printer to `{ expr }`.
 *
 * @example
 * ```swift
 * // swClosure(["item"], [swReturn(swMember(swIdent("item"), "name"))])
 * //   → { item in item.name }
 * ```
 */
export const swClosure = (
  params: ReadonlyArray<string>,
  body: ReadonlyArray<SwStmt>,
): SwClosureExpr => ({ kind: "closure", params, body });
