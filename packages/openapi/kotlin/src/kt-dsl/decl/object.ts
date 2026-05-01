import type { KtFun } from "../fun.js";
import type { KtVisibility } from "../visibility.js";
import type { KtAnnotation, KtProp } from "./prop.js";

export interface KtObject {
  kind: "object";
  name: string;
  visibility: KtVisibility;
  annotations: ReadonlyArray<KtAnnotation>;
  superTypes: ReadonlyArray<string>;
  properties: ReadonlyArray<KtProp>;
  funs: ReadonlyArray<KtFun>;
  runtime?: boolean;
}

/**
 * Top-level `object` declaration — Kotlin's singleton form. Used for
 * stateless helper buckets (`URLEncoding`, `MultipartFormBody` factory
 * funs, etc.) that don't need to be instantiated.
 *
 * @example
 * ```kotlin
 * // ktObject({ name: "URLEncoding", funs: [...] })
 * //   → public object URLEncoding { … }
 * ```
 */
export function ktObject(opts: {
  name: string;
  properties?: ReadonlyArray<KtProp>;
  funs?: ReadonlyArray<KtFun>;
  annotations?: ReadonlyArray<KtAnnotation>;
  superTypes?: ReadonlyArray<string>;
  visibility?: KtVisibility;
  runtime?: boolean;
}): KtObject {
  return {
    kind: "object",
    name: opts.name,
    visibility: opts.visibility ?? "public",
    annotations: opts.annotations ?? [],
    superTypes: opts.superTypes ?? [],
    properties: opts.properties ?? [],
    funs: opts.funs ?? [],
    runtime: opts.runtime,
  };
}
