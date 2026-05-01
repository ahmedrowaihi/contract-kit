import type { KtExpr } from "./types.js";

/**
 * Bare identifier reference.
 *
 * @example
 * ```kotlin
 * // ktIdent("request") → request
 * ```
 */
export const ktIdent = (name: string): KtExpr => ({ kind: "ident", name });

/**
 * Member access (dotted lookup).
 *
 * @example
 * ```kotlin
 * // ktMember(ktIdent("request"), "url") → request.url
 * ```
 */
export const ktMember = (on: KtExpr, name: string): KtExpr => ({
  kind: "member",
  on,
  name,
});

/**
 * Safe-call member access — `?.` propagates null through the chain.
 *
 * @example
 * ```kotlin
 * // ktSafeMember(ktIdent("user"), "email") → user?.email
 * ```
 */
export const ktSafeMember = (on: KtExpr, name: string): KtExpr => ({
  kind: "safeMember",
  on,
  name,
});

/**
 * Index access — `expr[index]`.
 *
 * @example
 * ```kotlin
 * // ktIndex(ktIdent("dict"), ktStr("key")) → dict["key"]
 * ```
 */
export const ktIndex = (on: KtExpr, index: KtExpr): KtExpr => ({
  kind: "index",
  on,
  index,
});

/**
 * `expr!!` — non-null assertion (Kotlin's force-unwrap). Use sparingly;
 * prefer `?.` chains or guarded checks where the codepath can recover.
 *
 * @example
 * ```kotlin
 * // ktNotNull(ktSafeMember(ktIdent("user"), "email")) → user?.email!!
 * ```
 */
export const ktNotNull = (on: KtExpr): KtExpr => ({ kind: "notNull", on });
