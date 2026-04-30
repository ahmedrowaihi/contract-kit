import type { SwExpr } from "../expr/types.js";
import type { SwType } from "../type/types.js";
import type { SwLetBinding, SwStmt } from "./types.js";

/**
 * Immutable binding (`let`). The `binding` may be a single name or a
 * tuple destructure (use `swTupleBinding`).
 *
 * @example
 * ```swift
 * // swLet("status", swIntLit(200))
 * //   → let status = 200
 * // swLet(swTupleBinding(["data", "response"]), …)
 * //   → let (data, response) = …
 * ```
 */
export const swLet = (
  binding: SwLetBinding,
  expr: SwExpr,
  type?: SwType,
): SwStmt => ({ kind: "let", binding, expr, type });

/**
 * Mutable binding (`var`).
 *
 * @example
 * ```swift
 * // swVar("request", swCall(swIdent("URLRequest"), [swArg(swIdent("url"), "url")]))
 * //   → var request = URLRequest(url: url)
 * ```
 */
export const swVar = (name: string, expr: SwExpr, type?: SwType): SwStmt => ({
  kind: "var",
  name,
  expr,
  type,
});

/**
 * Assignment to an existing l-value.
 *
 * @example
 * ```swift
 * // swAssign(swMember(swIdent("request"), "httpMethod"), swStr("GET"))
 * //   → request.httpMethod = "GET"
 * ```
 */
export const swAssign = (target: SwExpr, value: SwExpr): SwStmt => ({
  kind: "assign",
  target,
  value,
});

/**
 * Bare expression statement (the value is discarded).
 *
 * @example
 * ```swift
 * // swExprStmt(swCall(swMember(swIdent("multipart"), "finalize"), []))
 * //   → multipart.finalize()
 * ```
 */
export const swExprStmt = (expr: SwExpr): SwStmt => ({ kind: "expr", expr });

/**
 * Tuple destructure pattern for `swLet`. Use `"_"` to discard a slot.
 *
 * @example
 * ```swift
 * // swTupleBinding(["data", "_"]) → (data, _)
 * ```
 */
export const swTupleBinding = (
  names: ReadonlyArray<string | "_">,
): SwLetBinding => ({ kind: "tuple", names });
