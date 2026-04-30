import type { SwExpr } from "../expr/types.js";
import type { SwStmt, SwSwitchCase } from "./types.js";

/**
 * `return` (with or without an expression).
 *
 * @example
 * ```swift
 * // swReturn()                  → return
 * // swReturn(swIdent("data"))   → return data
 * ```
 */
export const swReturn = (expr?: SwExpr): SwStmt => ({ kind: "return", expr });

/**
 * `throw expr` — propagate a typed error.
 *
 * @example
 * ```swift
 * // swThrow(swCall(swMember(swIdent("APIError"), "decodingFailed"),
 * //                [swArg(swIdent("error"))]))
 * //   → throw APIError.decodingFailed(error)
 * ```
 */
export const swThrow = (expr: SwExpr): SwStmt => ({ kind: "throw", expr });

/**
 * `if cond { then } [else { else_ }]`.
 *
 * @example
 * ```swift
 * // swIf(swEq(swIdent("status"), swIntLit(200)),
 * //      [swReturn(swIdent("data"))])
 * //   → if status == 200 { return data }
 * ```
 */
export const swIf = (
  cond: SwExpr,
  then: ReadonlyArray<SwStmt>,
  else_?: ReadonlyArray<SwStmt>,
): SwStmt => ({ kind: "if", cond, then, else_ });

/**
 * `if let name = source { then } [else { else_ }]` — optional binding.
 *
 * @example
 * ```swift
 * // swIfLet("token", swIdent("token"), [swExprStmt(…)])
 * //   → if let token = token { … }
 * ```
 */
export const swIfLet = (
  name: string,
  source: SwExpr,
  then: ReadonlyArray<SwStmt>,
  else_?: ReadonlyArray<SwStmt>,
): SwStmt => ({ kind: "ifLet", name, source, then, else_ });

/**
 * `guard let name = source else { else_ }` — early-exit unwrap.
 *
 * @example
 * ```swift
 * // swGuardLet("httpResponse",
 * //            swAsOpt(swIdent("response"), swRef("HTTPURLResponse")),
 * //            [swThrow(…)])
 * //   → guard let httpResponse = response as? HTTPURLResponse else { throw … }
 * ```
 */
export const swGuardLet = (
  name: string,
  source: SwExpr,
  else_: ReadonlyArray<SwStmt>,
): SwStmt => ({ kind: "guardLet", name, source, else_ });

/**
 * `switch on { cases … [default: default_] }`.
 *
 * @example
 * ```swift
 * // swSwitch(swMember(swIdent("httpResponse"), "statusCode"),
 * //          [swCase([swRange(swIntLit(200), swIntLit(300))],
 * //                  [swReturn(swIdent("data"))])],
 * //          [swThrow(…)])
 * //   → switch httpResponse.statusCode {
 * //     case 200..<300: return data
 * //     default: throw …
 * //     }
 * ```
 */
export const swSwitch = (
  on: SwExpr,
  cases: ReadonlyArray<SwSwitchCase>,
  default_?: ReadonlyArray<SwStmt>,
): SwStmt => ({ kind: "switch", on, cases, default_ });

/**
 * One arm of a `switch` — a list of patterns paired with a body.
 *
 * @example
 * ```swift
 * // swCase([swDotCase("bearer")], [swReturn(…)])
 * //   → case .bearer: return …
 * ```
 */
export const swCase = (
  patterns: ReadonlyArray<SwExpr>,
  body: ReadonlyArray<SwStmt>,
): SwSwitchCase => ({ patterns, body });

/**
 * `for name in source { body }`.
 *
 * @example
 * ```swift
 * // swForIn("interceptor", swMember(swIdent("interceptors"), "request"),
 * //        [swAssign(swIdent("req"), swTryAwait(…))])
 * //   → for interceptor in interceptors.request { req = try await … }
 * ```
 */
export const swForIn = (
  name: string,
  source: SwExpr,
  body: ReadonlyArray<SwStmt>,
): SwStmt => ({ kind: "forIn", name, source, body });

/**
 * `do { body } catch { catch_ }`. The catch block binds the implicit
 * `error`.
 *
 * @example
 * ```swift
 * // swDoCatch([swReturn(swTry(…))], [swThrow(…)])
 * //   → do { return try … } catch { throw … }
 * ```
 */
export const swDoCatch = (
  body: ReadonlyArray<SwStmt>,
  catch_: ReadonlyArray<SwStmt>,
): SwStmt => ({ kind: "doCatch", body, catch_ });
