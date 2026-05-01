import type { KtFun } from "../fun.js";
import type { KtVisibility } from "../visibility.js";
import type { KtAnnotation, KtProp } from "./prop.js";

export interface KtDataClass {
  kind: "dataClass";
  name: string;
  visibility: KtVisibility;
  annotations: ReadonlyArray<KtAnnotation>;
  superTypes: ReadonlyArray<string>;
  /** All props live in the primary constructor on a data class. */
  properties: ReadonlyArray<KtProp>;
  funs: ReadonlyArray<KtFun>;
  runtime?: boolean;
}

/**
 * Top-level data class — Kotlin idiom for the equivalent of Swift's
 * `Codable struct`. Properties are emitted in the primary constructor.
 *
 * @example
 * ```kotlin
 * // ktDataClass({ name: "User", annotations: [ktAnnotation("Serializable")],
 * //               properties: [ktProp({ name: "id", type: ktString })] })
 * //   → @Serializable
 * //     public data class User(val id: String)
 * ```
 */
export function ktDataClass(opts: {
  name: string;
  properties: ReadonlyArray<KtProp>;
  annotations?: ReadonlyArray<KtAnnotation>;
  superTypes?: ReadonlyArray<string>;
  visibility?: KtVisibility;
  funs?: ReadonlyArray<KtFun>;
  runtime?: boolean;
}): KtDataClass {
  return {
    kind: "dataClass",
    name: opts.name,
    visibility: opts.visibility ?? "public",
    annotations: opts.annotations ?? [],
    superTypes: opts.superTypes ?? [],
    properties: opts.properties,
    funs: opts.funs ?? [],
    runtime: opts.runtime,
  };
}
