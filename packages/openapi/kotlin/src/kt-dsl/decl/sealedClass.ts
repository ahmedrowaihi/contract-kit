import type { KtFun } from "../fun.js";
import type { KtVisibility } from "../visibility.js";
import type { KtAnnotation, KtProp } from "./prop.js";

export interface KtSealedSubclass {
  kind: "sealedSubclass";
  /** Either `class` (with optional ctor params) or `object` (singleton). */
  variant: "class" | "object";
  name: string;
  /** Constructor-level props (only valid when `variant === "class"`). */
  properties: ReadonlyArray<KtProp>;
  annotations: ReadonlyArray<KtAnnotation>;
}

export interface KtSealedClass {
  kind: "sealedClass";
  name: string;
  visibility: KtVisibility;
  annotations: ReadonlyArray<KtAnnotation>;
  superTypes: ReadonlyArray<string>;
  subclasses: ReadonlyArray<KtSealedSubclass>;
  funs: ReadonlyArray<KtFun>;
  runtime?: boolean;
}

/**
 * One subclass arm of a sealed class. Either:
 *  - `data class <Name>(props…) : <Sealed>()` — payload-carrying arm
 *  - `object <Name> : <Sealed>()` — singleton arm
 *
 * @example
 * ```kotlin
 * // ktSealedSubclass({ variant: "class", name: "Status200",
 * //                    properties: [ktProp({ name: "value", type: ktRef("Pet"), inPrimary: true })] })
 * //   → public data class Status200(public val value: Pet) : <sealed>()
 * ```
 */
export function ktSealedSubclass(opts: {
  variant: "class" | "object";
  name: string;
  properties?: ReadonlyArray<KtProp>;
  annotations?: ReadonlyArray<KtAnnotation>;
}): KtSealedSubclass {
  return {
    kind: "sealedSubclass",
    variant: opts.variant,
    name: opts.name,
    properties: opts.properties ?? [],
    annotations: opts.annotations ?? [],
  };
}

/**
 * Sealed class — Kotlin's idiomatic sum type, equivalent to a Swift
 * `enum` with associated values.
 *
 * @example
 * ```kotlin
 * // ktSealedClass({ name: "GetPet_Response",
 * //                 subclasses: [
 * //                   ktSealedSubclass({ variant: "class", name: "Status200",
 * //                     properties: [ktProp({ name: "value", type: ktRef("Pet"), inPrimary: true })] }),
 * //                   ktSealedSubclass({ variant: "object", name: "Status404" }),
 * //                 ] })
 * //   → public sealed class GetPet_Response {
 * //         public data class Status200(public val value: Pet) : GetPet_Response()
 * //         public object Status404 : GetPet_Response()
 * //     }
 * ```
 */
export function ktSealedClass(opts: {
  name: string;
  subclasses: ReadonlyArray<KtSealedSubclass>;
  annotations?: ReadonlyArray<KtAnnotation>;
  superTypes?: ReadonlyArray<string>;
  visibility?: KtVisibility;
  funs?: ReadonlyArray<KtFun>;
  runtime?: boolean;
}): KtSealedClass {
  return {
    kind: "sealedClass",
    name: opts.name,
    visibility: opts.visibility ?? "public",
    annotations: opts.annotations ?? [],
    superTypes: opts.superTypes ?? [],
    subclasses: opts.subclasses,
    funs: opts.funs ?? [],
    runtime: opts.runtime,
  };
}
