import type { SwExpr } from "./types.js";

/**
 * `try expr` — propagate a thrown error from a synchronous throwing call.
 *
 * @example
 * ```swift
 * // swTry(swCall(swMember(swIdent("encoder"), "encode"), [swArg(swIdent("body"))]))
 * //   → try encoder.encode(body)
 * ```
 */
export const swTry = (expr: SwExpr): SwExpr => ({
  kind: "try",
  expr,
  awaited: false,
});

/**
 * `try await expr` — propagate a thrown error from an async throwing
 * call.
 *
 * @example
 * ```swift
 * // swTryAwait(swCall(swMember(swIdent("session"), "data"),
 * //                   [swArg(swIdent("request"), "for")]))
 * //   → try await session.data(for: request)
 * ```
 */
export const swTryAwait = (expr: SwExpr): SwExpr => ({
  kind: "try",
  expr,
  awaited: true,
});
