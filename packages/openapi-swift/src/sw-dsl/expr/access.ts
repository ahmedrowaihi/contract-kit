import type { SwExpr } from "./types.js";

/**
 * Bare identifier reference.
 *
 * @example
 * ```swift
 * // swIdent("request") → request
 * ```
 */
export const swIdent = (name: string): SwExpr => ({ kind: "ident", name });

/**
 * Leading-dot enum-case shorthand. Useful when the contextual type is
 * already known (function args, return position, etc.).
 *
 * @example
 * ```swift
 * // swDotCase("form") → .form
 * ```
 */
export const swDotCase = (name: string): SwExpr => ({ kind: "dotCase", name });

/**
 * Enum-case pattern with associated-value bindings — used as a `case`
 * pattern inside `switch`.
 *
 * @example
 * ```swift
 * // swEnumPattern("bearer", ["token"]) → .bearer(let token)
 * // swEnumPattern("apiKey", ["name", "value"]) → .apiKey(let name, let value)
 * ```
 */
export const swEnumPattern = (
  caseName: string,
  bindings: ReadonlyArray<string> = [],
): SwExpr => ({ kind: "enumPattern", case: caseName, bindings });

/**
 * Member access (dotted lookup).
 *
 * @example
 * ```swift
 * // swMember(swIdent("request"), "httpMethod") → request.httpMethod
 * ```
 */
export const swMember = (on: SwExpr, name: string): SwExpr => ({
  kind: "member",
  on,
  name,
});

/**
 * Optional-chained member access.
 *
 * @example
 * ```swift
 * // swOptChain(swIdent("user"), "email") → user?.email
 * ```
 */
export const swOptChain = (on: SwExpr, name: string): SwExpr => ({
  kind: "optChain",
  on,
  name,
});

/**
 * Subscript access.
 *
 * @example
 * ```swift
 * // swSubscript(swIdent("dict"), swStr("key")) → dict["key"]
 * ```
 */
export const swSubscript = (on: SwExpr, index: SwExpr): SwExpr => ({
  kind: "subscript",
  on,
  index,
});

/**
 * Force-unwrap an optional with `!`. Use sparingly — prefer `if let` /
 * `guard let` where the codepath can recover.
 *
 * @example
 * ```swift
 * // swForceUnwrap(swMember(swIdent("components"), "url")) → components.url!
 * ```
 */
export const swForceUnwrap = (on: SwExpr): SwExpr => ({
  kind: "forceUnwrap",
  on,
});
